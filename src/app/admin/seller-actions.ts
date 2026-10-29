"use server";

import { Prisma } from "@/generated/prisma/client";
import {
  NotificationChannel,
  NotificationType,
  SellerStatus,
  UserRole,
} from "@/generated/prisma/enums";
import { requirePageRoles } from "@/lib/authorization";
import type { ActionResult } from "@/lib/action-result";
import prisma from "@/lib/prisma";
import { z } from "zod";

const reviewSchema = z.enum([
  SellerStatus.APPROVED,
  SellerStatus.REJECTED,
  SellerStatus.SUSPENDED,
]);

const sellerIdSchema = z.string().min(1).max(128);

type ReviewedSeller = {
  id: string;
  shopName: string;
  status: SellerStatus;
  verifiedAt: Date | null;
};

export async function reviewSellerApplication(
  sellerIdInput: unknown,
  statusInput: unknown
): Promise<ActionResult<{ sellerProfile: ReviewedSeller }>> {
  const authorization = await requirePageRoles([
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  ]);
  const sellerId = sellerIdSchema.safeParse(sellerIdInput);
  if (!sellerId.success) {
    return { success: false, error: "Invalid seller application id" };
  }
  const result = reviewSchema.safeParse(statusInput);
  if (!result.success) {
    return { success: false, error: "Invalid seller review status" };
  }

  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { id: sellerId.data },
    select: { id: true, userId: true, status: true, shopName: true },
  });
  if (!sellerProfile) {
    return { success: false, error: "Seller application not found" };
  }
  if (sellerProfile.status !== SellerStatus.PENDING) {
    return {
      success: false,
      error: "Only pending seller applications can be reviewed",
    };
  }

  const status = result.data;
  const approved = status === SellerStatus.APPROVED;

  try {
    const updated = await prisma.$transaction(async (transaction) => {
      const changed = await transaction.sellerProfile.updateMany({
        where: { id: sellerProfile.id, status: SellerStatus.PENDING },
        data: { status, verifiedAt: approved ? new Date() : null },
      });
      if (changed.count !== 1) return null;

      await transaction.user.update({
        where: { id: sellerProfile.userId },
        data: { role: approved ? UserRole.SELLER : UserRole.BUYER },
      });

      await transaction.notification.create({
        data: {
          userId: sellerProfile.userId,
          type: NotificationType.SELLER_UPDATE,
          channel: NotificationChannel.IN_APP,
          title: approved ? "Seller application approved" : "Seller application update",
          body: approved
            ? `Your shop "${sellerProfile.shopName}" is approved.`
            : `Your shop application is ${status.toLowerCase()}.`,
          data: { sellerProfileId: sellerProfile.id, status },
        },
      });

      await transaction.auditLog.create({
        data: {
          actorId: authorization.user.id,
          action: "seller.application.reviewed",
          entityType: "SellerProfile",
          entityId: sellerProfile.id,
          metadata: { previousStatus: sellerProfile.status, status },
        },
      });

      return transaction.sellerProfile.findUniqueOrThrow({
        where: { id: sellerProfile.id },
        select: { id: true, shopName: true, status: true, verifiedAt: true },
      });
    });

    if (!updated) {
      return {
        success: false,
        error: "Only pending seller applications can be reviewed",
      };
    }
    return { success: true, data: { sellerProfile: updated } };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { success: false, error: "Seller application not found" };
    }
    throw error;
  }
}
