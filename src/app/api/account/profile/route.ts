import { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { authorizeRequest, isAuthorizationResponse } from "@/lib/authorization";
import { z } from "zod";

const profileSchema = z.object({
  username: z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/).optional(),
  displayName: z.string().trim().max(80).nullable().optional(),
  bio: z.string().trim().max(500).nullable().optional(),
  locale: z.string().trim().min(2).max(16).optional(),
  preferredCurrency: z.string().regex(/^[A-Z]{3}$/).optional(),
  emailNotifications: z.boolean().optional(),
}).strict();

export async function GET(request: Request) {
  const authorization = await authorizeRequest(request);
  if (isAuthorizationResponse(authorization)) return authorization;

  const profile = await prisma.accountProfile.findUnique({
    where: { userId: authorization.user.id },
    select: {
      username: true,
      displayName: true,
      bio: true,
      locale: true,
      preferredCurrency: true,
      emailNotifications: true,
    },
  });

  return Response.json({ profile });
}

export async function PATCH(request: Request) {
  const authorization = await authorizeRequest(request);
  if (isAuthorizationResponse(authorization)) return authorization;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const result = profileSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      { error: "Invalid profile data", issues: result.error.issues },
      { status: 400 }
    );
  }

  const existing = await prisma.accountProfile.findUnique({
    where: { userId: authorization.user.id },
    select: { id: true },
  });

  if (!existing && !result.data.username) {
    return Response.json(
      { error: "A username is required to create your profile" },
      { status: 400 }
    );
  }

  try {
    const profile = await prisma.accountProfile.upsert({
      where: { userId: authorization.user.id },
      update: result.data,
      create: {
        userId: authorization.user.id,
        username: result.data.username!,
        displayName: result.data.displayName,
        bio: result.data.bio,
        locale: result.data.locale,
        preferredCurrency: result.data.preferredCurrency,
        emailNotifications: result.data.emailNotifications,
      },
      select: {
        username: true,
        displayName: true,
        bio: true,
        locale: true,
        preferredCurrency: true,
        emailNotifications: true,
      },
    });

    return Response.json({ profile });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json({ error: "That username is already in use" }, { status: 409 });
    }

    throw error;
  }
}
