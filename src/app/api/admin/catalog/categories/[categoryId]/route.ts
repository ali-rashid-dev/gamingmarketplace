import { Prisma } from "@/generated/prisma/client";
import { UserRole } from "@/generated/prisma/enums";
import { categoryPatchSchema } from "@/lib/catalog-validation";
import { authorizeRequest, isAuthorizationResponse } from "@/lib/authorization";
import prisma from "@/lib/prisma";

type RouteContext = { params: Promise<{ categoryId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const authorization = await authorizeRequest(request, [
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  ]);
  if (isAuthorizationResponse(authorization)) return authorization;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const result = categoryPatchSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      { error: "Invalid category data", issues: result.error.issues },
      { status: 400 }
    );
  }

  const { categoryId } = await params;
  try {
    const category = await prisma.$transaction(async (transaction) => {
      const { fields, ...categoryData } = result.data;
      const updated = await transaction.category.update({
        where: { id: categoryId },
        data: {
          ...categoryData,
          ...(fields === undefined
            ? {}
            : {
                fields: {
                  deleteMany: {},
                  create: fields.map((field) => ({ ...field, options: field.options })),
                },
              }),
        },
        include: { fields: { orderBy: { sortOrder: "asc" } } },
      });
      await transaction.auditLog.create({
        data: {
          actorId: authorization.user.id,
          action: "catalog.category.updated",
          entityType: "Category",
          entityId: updated.id,
          metadata: { name: updated.name, slug: updated.slug },
        },
      });
      return updated;
    });
    return Response.json({ category });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return Response.json({ error: "Category not found" }, { status: 404 });
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json({ error: "A category with that slug or field key already exists" }, { status: 409 });
    }
    throw error;
  }
}
