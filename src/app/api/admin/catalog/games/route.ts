import { Prisma } from "@/generated/prisma/client";
import { UserRole } from "@/generated/prisma/enums";
import { gameSchema } from "@/lib/catalog-validation";
import { authorizeRequest, isAuthorizationResponse } from "@/lib/authorization";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const authorization = await authorizeRequest(request, [
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  ]);
  if (isAuthorizationResponse(authorization)) return authorization;

  const games = await prisma.game.findMany({
    orderBy: { name: "asc" },
    include: {
      categories: {
        orderBy: { name: "asc" },
        include: { fields: { orderBy: { sortOrder: "asc" } } },
      },
      _count: { select: { listings: true } },
    },
  });

  return Response.json({ games });
}

export async function POST(request: Request) {
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

  const result = gameSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      { error: "Invalid game data", issues: result.error.issues },
      { status: 400 }
    );
  }

  try {
    const game = await prisma.$transaction(async (transaction) => {
      const created = await transaction.game.create({ data: result.data });
      await transaction.auditLog.create({
        data: {
          actorId: authorization.user.id,
          action: "catalog.game.created",
          entityType: "Game",
          entityId: created.id,
        },
      });
      return created;
    });
    return Response.json({ game }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json({ error: "A game with that name or slug already exists" }, { status: 409 });
    }
    throw error;
  }
}
