"use server";

import { Prisma } from "@/generated/prisma/client";
import { SellerStatus, UserRole } from "@/generated/prisma/enums";
import prisma from "@/lib/prisma";
import { requirePageSession } from "@/lib/authorization";
import type { ActionResult } from "@/lib/action-result";
import { z } from "zod";

const onboardingSchema = z
  .object({
    shopName: z.string().trim().min(3).max(80),
    description: z.string().trim().max(1000).optional(),
  })
  .strict();

type SellerApplication = {
  id: string;
  shopName: string;
  description: string | null;
  status: SellerStatus;
  verifiedAt?: Date | null;
  createdAt: Date;
};

const applicationSelection = {
  id: true,
  shopName: true,
  description: true,
  status: true,
  createdAt: true,
} as const;

export async function getSellerApplication(): Promise<
  ActionResult<{ sellerProfile: SellerApplication | null }>
> {
  const { user } = await requirePageSession();
  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId: user.id },
    select: {
      ...applicationSelection,
      verifiedAt: true,
    },
  });
  return { success: true, data: { sellerProfile } };
}

export async function submitSellerApplication(
  input: unknown
): Promise<ActionResult<{ sellerProfile: SellerApplication }>> {
  const { user } = await requirePageSession();
  if (user.role !== UserRole.BUYER) {
    return {
      success: false,
      error: "Only buyer accounts can submit a seller application",
    };
  }

  const result = onboardingSchema.safeParse(input);
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message ?? "Invalid seller application",
    };
  }

  const slugBase = result.data.shopName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const slug = `${slugBase || "shop"}-${user.id.slice(0, 8).toLowerCase()}`;

  try {
    const existing = await prisma.sellerProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, status: true },
    });

    if (existing && existing.status !== SellerStatus.REJECTED) {
      return {
        success: false,
        error: "An active or previously approved seller application already exists",
      };
    }

    let sellerProfile: SellerApplication;
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
        return {
          success: false,
          error: "The seller application changed while it was being resubmitted",
        };
      }

      sellerProfile = await prisma.sellerProfile.findUniqueOrThrow({
        where: { id: existing.id },
        select: applicationSelection,
      });
    } else {
      sellerProfile = await prisma.sellerProfile.create({
        data: {
          userId: user.id,
          shopName: result.data.shopName,
          slug,
          description: result.data.description,
        },
        select: applicationSelection,
      });
    }

    return { success: true, data: { sellerProfile } };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error: "A seller application already exists for this account",
      };
    }
    throw error;
  }
}
