import {
  NotificationChannel,
  NotificationType,
  SellerStatus,
  UserRole,
} from "@/generated/prisma/enums";
import prisma from "@/lib/prisma";
import { authorizeRequest, isAuthorizationResponse } from "@/lib/authorization";
import { z } from "zod";

const reviewSchema = z.object({
  status: z.enum([SellerStatus.APPROVED, SellerStatus.REJECTED, SellerStatus.SUSPENDED]),
}).strict();

type RouteContext = {
  params: Promise<{ sellerId: string }>;
};

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

  const result = reviewSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      { error: "Invalid seller review status", issues: result.error.issues },
      { status: 400 }
    );
  }

  const { sellerId } = await params;
  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { id: sellerId },
    select: { id: true, userId: true, status: true, shopName: true },
  });

  if (!sellerProfile) {
    return Response.json({ error: "Seller application not found" }, { status: 404 });
  }

  if (sellerProfile.status !== SellerStatus.PENDING) {
    return Response.json(
      { error: "Only pending seller applications can be reviewed" },
      { status: 409 }
    );
  }

  const { status } = result.data;
  const approved = status === SellerStatus.APPROVED;

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
    return Response.json(
      { error: "Only pending seller applications can be reviewed" },
      { status: 409 }
    );
  }

  return Response.json({ sellerProfile: updated });
}
