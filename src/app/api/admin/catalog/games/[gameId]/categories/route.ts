import { Prisma } from "@/generated/prisma/client";
import { UserRole } from "@/generated/prisma/enums";
import { categorySchema } from "@/lib/catalog-validation";
import { authorizeRequest, isAuthorizationResponse } from "@/lib/authorization";
import prisma from "@/lib/prisma";

type RouteContext = { params: Promise<{ gameId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
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

  const result = categorySchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      { error: "Invalid category data", issues: result.error.issues },
      { status: 400 }
    );
  }

  const { gameId } = await params;
  try {
    const category = await prisma.$transaction(async (transaction) => {
      const created = await transaction.category.create({
        data: {
          gameId,
          name: result.data.name,
          slug: result.data.slug,
          type: result.data.type,
          description: result.data.description,
          platforms: result.data.platforms,
          isActive: result.data.isActive,
          fields: {
            create: result.data.fields.map((field) => ({
              ...field,
              options: field.options,
            })),
          },
        },
        include: { fields: { orderBy: { sortOrder: "asc" } } },
      });
      await transaction.auditLog.create({
        data: {
          actorId: authorization.user.id,
          action: "catalog.category.created",
          entityType: "Category",
          entityId: created.id,
          metadata: { gameId, name: created.name, slug: created.slug },
        },
      });
      return created;
    });
    return Response.json({ category }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json({ error: "A category with that slug or field key already exists" }, { status: 409 });
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return Response.json({ error: "Game not found" }, { status: 404 });
    }
    throw error;
  }
}
