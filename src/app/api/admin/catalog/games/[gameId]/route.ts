import { Prisma } from "@/generated/prisma/client";
import { UserRole } from "@/generated/prisma/enums";
import { gamePatchSchema } from "@/lib/catalog-validation";
import { authorizeRequest, isAuthorizationResponse } from "@/lib/authorization";
import prisma from "@/lib/prisma";

type RouteContext = { params: Promise<{ gameId: string }> };

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

  const result = gamePatchSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      { error: "Invalid game data", issues: result.error.issues },
      { status: 400 }
    );
  }

  const { gameId } = await params;
  try {
    const game = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.game.update({
        where: { id: gameId },
        data: result.data,
      });
      await transaction.auditLog.create({
        data: {
          actorId: authorization.user.id,
          action: "catalog.game.updated",
          entityType: "Game",
          entityId: updated.id,
          metadata: result.data,
        },
      });
      return updated;
    });
    return Response.json({ game });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return Response.json({ error: "Game not found" }, { status: 404 });
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json({ error: "A game with that name or slug already exists" }, { status: 409 });
    }
    throw error;
  }
}
