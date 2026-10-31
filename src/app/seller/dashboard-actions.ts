"use server";

import {
  DeliveryStatus,
  DisputeStatus,
  OrderItemStatus,
  OrderStatus,
  SellerStatus,
  UserRole,
} from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { requirePageRoles } from "@/lib/authorization";
import prisma from "@/lib/prisma";
import { z } from "zod";

async function requireSeller() {
  const session = await requirePageRoles([UserRole.SELLER]);
  const seller = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, status: true },
  });
  if (!seller || seller.status !== SellerStatus.APPROVED) {
    return { success: false as const, error: "An approved seller profile is required" };
  }
  return { success: true as const, sellerId: seller.id, userId: session.user.id };
}

export async function updateSellerShopProfile(
  input: unknown
): Promise<ActionResult<{ shopName: string; description: string | null }>> {
  const authorization = await requireSeller();
  if (!authorization.success) return { success: false, error: authorization.error };
  const result = z
    .object({
      shopName: z.string().trim().min(3).max(80),
      description: z.string().trim().max(1000),
      displayName: z.string().trim().max(80),
    })
    .strict()
    .safeParse(input);
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message ?? "Invalid shop profile" };
  }

  const seller = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.sellerProfile.update({
      where: { id: authorization.sellerId },
      data: {
        shopName: result.data.shopName,
        description: result.data.description || null,
      },
      select: { slug: true, shopName: true, description: true },
    });
    if (result.data.displayName) {
      await transaction.user.update({
        where: { id: authorization.userId },
        data: { name: result.data.displayName },
      });
    }
    return updated;
  });
  revalidatePath("/seller/profile");
  revalidatePath("/seller/settings");
  revalidatePath(`/shops/${seller.slug}`);
  return { success: true, data: { shopName: seller.shopName, description: seller.description } };
}

export async function updateSellerAvailability(
  input: unknown
): Promise<ActionResult<{ isAvailable: boolean }>> {
  const authorization = await requireSeller();
  if (!authorization.success) return { success: false, error: authorization.error };
  const available = z.boolean().safeParse(input);
  if (!available.success) return { success: false, error: "Choose an availability setting" };

  const seller = await prisma.sellerProfile.update({
    where: { id: authorization.sellerId },
    data: { isAvailable: available.data },
    select: { slug: true, isAvailable: true },
  });
  revalidatePath("/seller");
  revalidatePath("/seller/settings");
  revalidatePath(`/shops/${seller.slug}`);
  revalidatePath("/offers");
  revalidatePath("/games");
  return { success: true, data: { isAvailable: seller.isAvailable } };
}

export async function updateSellerAccountSettings(
  input: unknown
): Promise<ActionResult<{ emailNotifications: boolean; preferredCurrency: string }>> {
  const authorization = await requireSeller();
  if (!authorization.success) return { success: false, error: authorization.error };
  const result = z
    .object({
      emailNotifications: z.boolean(),
      preferredCurrency: z.enum(["USD", "EUR", "GBP", "CAD", "AUD"]),
      username: z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/).optional(),
    })
    .strict()
    .safeParse(input);
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message ?? "Invalid account settings" };
  }
  try {
    const existing = await prisma.accountProfile.findUnique({
      where: { userId: authorization.userId },
      select: { username: true },
    });
    const username = result.data.username ?? existing?.username;
    if (!username) {
      return { success: false, error: "Set a username in account profile before saving settings" };
    }
    const profile = await prisma.accountProfile.upsert({
      where: { userId: authorization.userId },
      update: {
        emailNotifications: result.data.emailNotifications,
        preferredCurrency: result.data.preferredCurrency,
        ...(result.data.username ? { username: result.data.username } : {}),
      },
      create: {
        userId: authorization.userId,
        username,
        emailNotifications: result.data.emailNotifications,
        preferredCurrency: result.data.preferredCurrency,
      },
      select: { emailNotifications: true, preferredCurrency: true },
    });
    revalidatePath("/seller/settings");
    return { success: true, data: profile };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return { success: false, error: "That username is already in use" };
    }
    throw error;
  }
}

const credentialPattern =
  /(?:password|passcode|recovery\s+code|backup\s+code|login\s+credentials?)\s*[:=]\s*\S+/i;

export async function replyToSellerConversation(
  conversationIdInput: unknown,
  bodyInput: unknown
): Promise<ActionResult<{ messageId: string }>> {
  const authorization = await requireSeller();
  if (!authorization.success) return { success: false, error: authorization.error };
  const conversationId = z.string().trim().min(1).max(128).safeParse(conversationIdInput);
  const body = z.string().trim().min(1).max(2000).safeParse(bodyInput);
  if (!conversationId.success || !body.success) {
    return { success: false, error: "Enter a message up to 2,000 characters" };
  }
  if (credentialPattern.test(body.data)) {
    return {
      success: false,
      error: "Do not send account passwords or recovery codes in messages",
    };
  }
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId.data, sellerId: authorization.userId },
    select: { id: true, orderId: true },
  });
  if (!conversation) return { success: false, error: "Conversation not found" };

  const message = await prisma.$transaction(async (transaction) => {
    const created = await transaction.message.create({
      data: {
        conversationId: conversation.id,
        senderId: authorization.userId,
        orderId: conversation.orderId,
        body: body.data,
      },
      select: { id: true },
    });
    await transaction.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });
    return created;
  });
  revalidatePath("/seller/messages");
  return { success: true, data: { messageId: message.id } };
}

export async function updateSellerOrderItem(
  orderItemIdInput: unknown,
  actionInput: unknown,
  deliveryInstructionsInput?: unknown
): Promise<ActionResult<{ status: OrderItemStatus }>> {
  const authorization = await requireSeller();
  if (!authorization.success) return { success: false, error: authorization.error };
  const orderItemId = z.string().trim().min(1).max(128).safeParse(orderItemIdInput);
  const action = z.enum(["process", "mark-delivered"]).safeParse(actionInput);
  if (!orderItemId.success || !action.success) {
    return { success: false, error: "Invalid order update" };
  }
  const deliveryInstructions =
    action.data === "mark-delivered"
      ? z.string().trim().min(5).max(2000).safeParse(deliveryInstructionsInput)
      : null;
  if (deliveryInstructions && !deliveryInstructions.success) {
    return {
      success: false,
      error: "Add delivery instructions (5–2,000 characters)",
    };
  }
  if (deliveryInstructions?.success && credentialPattern.test(deliveryInstructions.data)) {
    return {
      success: false,
      error: "Do not include account passwords or recovery codes in delivery instructions",
    };
  }

  const item = await prisma.orderItem.findFirst({
    where: { id: orderItemId.data, sellerId: authorization.sellerId },
    include: {
      order: { select: { status: true } },
      disputes: {
        where: { status: { in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] } },
        select: { id: true },
        take: 1,
      },
    },
  });
  if (!item) return { success: false, error: "Order item not found" };
  if (item.disputes.length > 0) {
    return { success: false, error: "Fulfillment is paused while this order item is disputed" };
  }
  if (
    item.order.status !== OrderStatus.PAID &&
    item.order.status !== OrderStatus.PROCESSING
  ) {
    return { success: false, error: "This order is not ready for fulfillment" };
  }

  if (action.data === "process") {
    if (item.status !== OrderItemStatus.PENDING) {
      return { success: false, error: "Only pending items can be started" };
    }
    let updated: OrderItemStatus | null;
    try {
      updated = await prisma.$transaction(async (transaction) => {
        const delivery = await transaction.delivery.findFirst({
          where: { orderItemId: item.id },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: { id: true, status: true },
        });
        if (
          delivery &&
          delivery.status !== DeliveryStatus.PENDING &&
          delivery.status !== DeliveryStatus.IN_PROGRESS
        ) {
          return null;
        }

        const changed = await transaction.orderItem.updateMany({
          where: {
            id: item.id,
            sellerId: authorization.sellerId,
            status: OrderItemStatus.PENDING,
            order: { status: { in: [OrderStatus.PAID, OrderStatus.PROCESSING] } },
            disputes: {
              none: {
                status: { in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] },
              },
            },
          },
          data: { status: OrderItemStatus.PROCESSING },
        });
        if (changed.count !== 1) return null;
        if (item.order.status === OrderStatus.PAID) {
          const orderChanged = await transaction.order.updateMany({
            where: { id: item.orderId, status: OrderStatus.PAID },
            data: { status: OrderStatus.PROCESSING },
          });
          if (orderChanged.count !== 1) {
            throw new Error("ORDER_TRANSITION_CONFLICT");
          }
          await transaction.auditLog.create({
            data: {
              actorId: authorization.userId,
              action: "order.status_changed",
              entityType: "Order",
              entityId: item.orderId,
              metadata: {
                from: OrderStatus.PAID,
                to: OrderStatus.PROCESSING,
                reason: "seller_started_fulfillment",
              },
            },
          });
        }
        if (delivery) {
          const deliveryChanged = await transaction.delivery.updateMany({
            where: {
              id: delivery.id,
              status: { in: [DeliveryStatus.PENDING, DeliveryStatus.IN_PROGRESS] },
            },
            data: { status: DeliveryStatus.IN_PROGRESS },
          });
          if (deliveryChanged.count !== 1) {
            throw new Error("ORDER_TRANSITION_CONFLICT");
          }
        } else {
          await transaction.delivery.create({
            data: {
              orderId: item.orderId,
              orderItemId: item.id,
              status: DeliveryStatus.IN_PROGRESS,
            },
          });
        }
        await transaction.auditLog.create({
          data: {
            actorId: authorization.userId,
            action: "order.item.processing_started",
            entityType: "OrderItem",
            entityId: item.id,
            metadata: {
              orderId: item.orderId,
              from: OrderItemStatus.PENDING,
              to: OrderItemStatus.PROCESSING,
            },
          },
        });
        return OrderItemStatus.PROCESSING;
      });
    } catch (error) {
      if (error instanceof Error && error.message === "ORDER_TRANSITION_CONFLICT") {
        return { success: false, error: "Order item changed; refresh and try again" };
      }
      throw error;
    }
    if (!updated) return { success: false, error: "Order item changed; refresh and try again" };
    revalidatePath("/seller/orders");
    revalidatePath("/seller");
    return { success: true, data: { status: updated } };
  }

  if (item.status !== OrderItemStatus.PROCESSING) {
    return { success: false, error: "Only items in progress can be marked delivered" };
  }
  let delivered: boolean;
  try {
    delivered = await prisma.$transaction(async (transaction) => {
      const currentDelivery = await transaction.delivery.findFirst({
        where: { orderItemId: item.id },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: { id: true, status: true },
      });
      if (
        currentDelivery &&
        currentDelivery.status !== DeliveryStatus.IN_PROGRESS
      ) {
        return false;
      }
      const changed = await transaction.orderItem.updateMany({
        where: {
          id: item.id,
          sellerId: authorization.sellerId,
          status: OrderItemStatus.PROCESSING,
          order: { status: { in: [OrderStatus.PAID, OrderStatus.PROCESSING] } },
          disputes: {
            none: {
              status: { in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] },
            },
          },
        },
        data: { status: OrderItemStatus.DELIVERED },
      });
      if (changed.count !== 1) return false;
      if (currentDelivery) {
        const deliveryChanged = await transaction.delivery.updateMany({
          where: {
            id: currentDelivery.id,
            status: DeliveryStatus.IN_PROGRESS,
          },
          data: {
            status: DeliveryStatus.DELIVERED,
            instructions: deliveryInstructions?.success
              ? deliveryInstructions.data
              : undefined,
            deliveredAt: new Date(),
          },
        });
        if (deliveryChanged.count !== 1) {
          throw new Error("ORDER_TRANSITION_CONFLICT");
        }
      } else {
        await transaction.delivery.create({
          data: {
            orderId: item.orderId,
            orderItemId: item.id,
            status: DeliveryStatus.DELIVERED,
            instructions: deliveryInstructions?.success
              ? deliveryInstructions.data
              : undefined,
            deliveredAt: new Date(),
          },
        });
      }
      await transaction.auditLog.create({
        data: {
          actorId: authorization.userId,
          action: "order.item.delivered",
          entityType: "OrderItem",
          entityId: item.id,
          metadata: {
            orderId: item.orderId,
            from: OrderItemStatus.PROCESSING,
            to: OrderItemStatus.DELIVERED,
            deliveryFrom: DeliveryStatus.IN_PROGRESS,
            deliveryTo: DeliveryStatus.DELIVERED,
          },
        },
      });
      return true;
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_TRANSITION_CONFLICT") {
      return { success: false, error: "Order item changed; refresh and try again" };
    }
    throw error;
  }
  if (!delivered) {
    return { success: false, error: "Order item changed; refresh and try again" };
  }
  revalidatePath("/seller/orders");
  revalidatePath("/seller");
  return { success: true, data: { status: OrderItemStatus.DELIVERED } };
}
