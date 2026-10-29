import { Prisma } from "@/generated/prisma/client";
import { SellerStatus, UserRole } from "@/generated/prisma/enums";
import prisma from "@/lib/prisma";
import { authorizeRequest, isAuthorizationResponse } from "@/lib/authorization";
import { z } from "zod";

const onboardingSchema = z.object({
  shopName: z.string().trim().min(3).max(80),
  description: z.string().trim().max(1000).optional(),
}).strict();

export async function GET(request: Request) {
  const authorization = await authorizeRequest(request);
  if (isAuthorizationResponse(authorization)) return authorization;

  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId: authorization.user.id },
    select: {
      id: true,
      shopName: true,
      description: true,
      status: true,
      verifiedAt: true,
      createdAt: true,
    },
  });

  return Response.json({ sellerProfile });
}

export async function POST(request: Request) {
  const authorization = await authorizeRequest(request, [UserRole.BUYER]);
  if (isAuthorizationResponse(authorization)) return authorization;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const result = onboardingSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      { error: "Invalid seller application", issues: result.error.issues },
      { status: 400 }
    );
  }

  const slugBase = result.data.shopName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const slug = `${slugBase || "shop"}-${authorization.user.id.slice(0, 8).toLowerCase()}`;

  try {
    const existing = await prisma.sellerProfile.findUnique({
      where: { userId: authorization.user.id },
      select: { id: true, status: true },
    });

    if (existing && existing.status !== SellerStatus.REJECTED) {
      return Response.json(
        { error: "An active or previously approved seller application already exists" },
        { status: 409 }
      );
    }

    const selection = {
      id: true,
      shopName: true,
      description: true,
      status: true,
      createdAt: true,
    } as const;
    let sellerProfile;

    if (existing) {
      const updated = await prisma.sellerProfile.updateMany({
        where: { id: existing.id, status: SellerStatus.REJECTED },
        data: {
          shopName: result.data.shopName,
          slug,
          description: result.data.description,
          status: SellerStatus.PENDING,
          verifiedAt: null,
        },
      });

      if (updated.count !== 1) {
        return Response.json(
          { error: "The seller application changed while it was being resubmitted" },
          { status: 409 }
        );
      }

      sellerProfile = await prisma.sellerProfile.findUniqueOrThrow({
        where: { id: existing.id },
        select: selection,
      });
    } else {
      sellerProfile = await prisma.sellerProfile.create({
        data: {
          userId: authorization.user.id,
          shopName: result.data.shopName,
          slug,
          description: result.data.description,
        },
        select: selection,
      });
    }

    return Response.json({ sellerProfile }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json(
        { error: "A seller application already exists for this account" },
        { status: 409 }
      );
    }

    throw error;
  }
}
