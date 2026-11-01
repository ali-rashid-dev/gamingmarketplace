"use server";

import {
  DeliveryStatus,
  ConversationReportReason,
  DisputeStatus,
  NotificationType,
  OrderItemStatus,
  OrderStatus,
  ReviewReportReason,
  ReviewStatus,
  SupportTicketStatus,
  UserRole,
} from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type { ActionResult } from "@/lib/action-result";
import { requirePageRoles, requirePageSession } from "@/lib/authorization";
import { getAuth } from "@/lib/auth";
import { enqueueUserNotification } from "@/lib/notification-outbox";
import prisma from "@/lib/prisma";
import { publicListingWhere } from "@/lib/storefront";
import { canConfirmBuyerReceipt } from "@/lib/order-transitions";
import { hasValidUploadSignature } from "@/lib/upload-validation";
import { UTApi } from "uploadthing/server";
import {
  enforceMessageRateLimit,
  MAX_MESSAGE_ATTACHMENT_SIZE,
  MESSAGE_ATTACHMENT_TYPES,
  messageAttachmentsSchema,
  messageCredentialPattern,
  type MessageAttachment,
} from "@/lib/messaging";
import { z } from "zod";

const credentialPattern = messageCredentialPattern;

async function notifyConversationRecipient(
  transaction: Prisma.TransactionClient,
  input: {
    userId: string;
    conversationId: string;
    orderId: string | null;
    senderName: string;
    messageId: string;
  }
) {
  await enqueueUserNotification(transaction, {
    userId: input.userId,
    type: NotificationType.MESSAGE,
    title: "New message",
    body: `${input.senderName} sent you a message.`,
    eventKey: `message:${input.messageId}`,
    data: {
        conversationId: input.conversationId,
        orderId: input.orderId,
        recipientWorkspace: "SELLER",
    },
  });
}

export async function addWishlistItem(
  listingIdInput: unknown
): Promise<ActionResult<{ id: string }>> {
  const { user } = await requirePageSession();
  const listingId = z.string().trim().min(1).max(128).safeParse(listingIdInput);
  if (!listingId.success) return { success: false, error: "Choose an offer to save" };
  const listing = await prisma.listing.findFirst({
    where: { AND: [{ id: listingId.data }, publicListingWhere()] },
    select: { id: true },
  });
  if (!listing) return { success: false, error: "This offer is no longer available" };
  try {
    const saved = await prisma.wishlistItem.create({
      data: { userId: user.id, listingId: listing.id },
      select: { id: true },
    });
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/wishlist");
    return { success: true, data: saved };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "This offer is already in your wishlist" };
    }
    throw error;
  }
}

export async function removeWishlistItem(
  wishlistIdInput: unknown
): Promise<ActionResult<{ removed: boolean }>> {
  const { user } = await requirePageSession();
  const wishlistId = z.string().trim().min(1).max(128).safeParse(wishlistIdInput);
  if (!wishlistId.success) return { success: false, error: "Invalid wishlist item" };
  const result = await prisma.wishlistItem.deleteMany({
    where: { id: wishlistId.data, userId: user.id },
  });
  if (result.count !== 1) {
    return { success: false, error: "Wishlist item not found" };
  }
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/wishlist");
  return { success: true, data: { removed: result.count === 1 } };
}

export async function sendBuyerMessage(
  conversationIdInput: unknown,
  bodyInput: unknown,
  attachmentsInput: unknown = []
): Promise<ActionResult<{ messageId: string }>> {
  const { user } = await requirePageSession();
  const conversationId = z.string().trim().min(1).max(128).safeParse(conversationIdInput);
  const body = z.string().trim().max(2000).safeParse(bodyInput);
  const attachments = messageAttachmentsSchema.safeParse(attachmentsInput);
  if (!conversationId.success || !body.success) {
    return { success: false, error: "Enter a message up to 2,000 characters" };
  }
  if (!attachments.success) {
    return { success: false, error: "Choose up to four supported attachments, each 5 MB or smaller" };
  }
  if (!body.data && !attachments.data.length) {
    return { success: false, error: "Write a message or attach a file" };
  }
  if (messageCredentialPattern.test(body.data)) {
    return {
      success: false,
      error: "Do not send account passwords or recovery codes in messages",
    };
  }
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId.data, buyerId: user.id },
    select: { id: true, orderId: true, sellerId: true },
  });
  if (!conversation) return { success: false, error: "Conversation not found" };
  const message = await prisma.$transaction(async (transaction) => {
    if (!(await enforceMessageRateLimit(transaction, user.id))) return null;
    const created = await transaction.message.create({
      data: {
        conversationId: conversation.id,
        senderId: user.id,
        orderId: conversation.orderId,
        body: body.data,
        attachments: attachments.data,
      },
      select: { id: true },
    });
    await transaction.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });
    await notifyConversationRecipient(transaction, {
      userId: conversation.sellerId,
      conversationId: conversation.id,
      orderId: conversation.orderId,
      senderName: user.name,
      messageId: created.id,
    });
    return created;
  });
  if (!message) return { success: false, error: "You are sending messages too quickly. Try again in a minute." };
  revalidatePath("/dashboard/messages");
  revalidatePath("/seller/messages");
  revalidatePath("/dashboard");
  return { success: true, data: { messageId: message.id } };
}

export async function startBuyerConversation(
  listingIdInput: unknown,
  bodyInput: unknown
): Promise<ActionResult<{ conversationId: string }>> {
  const { user } = await requirePageSession();
  const listingId = z.string().trim().min(1).max(128).safeParse(listingIdInput);
  const body = z.string().trim().min(1).max(2000).safeParse(bodyInput);
  if (!listingId.success || !body.success) {
    return { success: false, error: "Enter a message up to 2,000 characters" };
  }
  if (messageCredentialPattern.test(body.data)) {
    return {
      success: false,
      error: "Do not send account passwords or recovery codes in messages",
    };
  }
  const listing = await prisma.listing.findFirst({
    where: {
      id: listingId.data,
      status: "ACTIVE",
      publishedAt: { not: null },
      quantity: { gt: 0 },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      game: { status: "PUBLISHED" },
      category: { isActive: true },
      seller: { status: "APPROVED", isAvailable: true },
    },
    select: { id: true, title: true, seller: { select: { userId: true } } },
  });
  if (!listing) return { success: false, error: "This offer is no longer available" };
  if (listing.seller.userId === user.id) {
    return { success: false, error: "You cannot message yourself about your own offer" };
  }
  const pair = {
    buyerId: user.id,
    sellerId: listing.seller.userId,
    orderId: null,
  };
  const messageBody = `Regarding ${listing.title} (${listing.id}):\n\n${body.data}`;
  const appendMessage = async (
    transaction: Prisma.TransactionClient,
    conversationId: string
  ) => {
    if (!(await enforceMessageRateLimit(transaction, user.id))) {
      throw new Error("MESSAGE_RATE_LIMIT");
    }
    const created = await transaction.message.create({
      data: {
        conversationId,
        senderId: user.id,
        body: messageBody,
      },
      select: { id: true },
    });
    await transaction.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
    await notifyConversationRecipient(transaction, {
      userId: listing.seller.userId,
      conversationId,
      orderId: null,
      senderName: user.name,
      messageId: created.id,
    });
  };
  let conversationCreationFailed = false;
  let conversation: { id: string };
  try {
    conversation = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.conversation.findFirst({
        where: pair,
        select: { id: true },
      });
      let target = existing;
      if (!target) {
        conversationCreationFailed = true;
        target = await transaction.conversation.create({
          data: { buyerId: pair.buyerId, sellerId: pair.sellerId },
          select: { id: true },
        });
        conversationCreationFailed = false;
      }
      await appendMessage(transaction, target.id);
      return target;
    });
  } catch (error) {
    if (error instanceof Error && error.message === "MESSAGE_RATE_LIMIT") {
      return { success: false, error: "You are sending messages too quickly. Try again in a minute." };
    }
    if (
      !conversationCreationFailed ||
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== "P2002"
    ) {
      throw error;
    }
    const existing = await prisma.$transaction(async (transaction) => {
      const target = await transaction.conversation.findFirst({
        where: pair,
        select: { id: true },
      });
      if (target) await appendMessage(transaction, target.id);
      return target;
    });
    if (!existing) throw error;
    conversation = existing;
  }
  revalidatePath("/dashboard/messages");
  revalidatePath("/seller/messages");
  return { success: true, data: { conversationId: conversation.id } };
}

export async function startBuyerOrderConversation(
  orderIdInput: unknown,
  sellerUserIdInput: unknown
): Promise<ActionResult<{ conversationId: string }>> {
  const { user } = await requirePageSession();
  const orderId = z.string().trim().min(1).max(128).safeParse(orderIdInput);
  const sellerUserId = z.string().trim().min(1).max(128).safeParse(sellerUserIdInput);
  if (!orderId.success || !sellerUserId.success) {
    return { success: false, error: "Invalid order conversation" };
  }
  const orderItem = await prisma.orderItem.findFirst({
    where: {
      orderId: orderId.data,
      seller: { userId: sellerUserId.data, status: "APPROVED" },
      order: { buyerId: user.id },
    },
    select: { id: true },
  });
  if (!orderItem) return { success: false, error: "Order or seller not found" };

  try {
    const conversation = await prisma.conversation.create({
      data: {
        buyerId: user.id,
        sellerId: sellerUserId.data,
        orderId: orderId.data,
      },
      select: { id: true },
    });
    revalidatePath("/dashboard/messages");
    revalidatePath("/seller/messages");
    return { success: true, data: { conversationId: conversation.id } };
  } catch (error) {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== "P2002"
    ) {
      throw error;
    }
    const existing = await prisma.conversation.findFirst({
      where: {
        buyerId: user.id,
        sellerId: sellerUserId.data,
        orderId: orderId.data,
      },
      select: { id: true },
    });
    if (!existing) throw error;
    return { success: true, data: { conversationId: existing.id } };
  }
}

export async function markBuyerConversationRead(
  conversationIdInput: unknown
): Promise<ActionResult<{ updated: number }>> {
  const { user } = await requirePageSession();
  const conversationId = z.string().trim().min(1).max(128).safeParse(conversationIdInput);
  if (!conversationId.success) {
    return { success: false, error: "Invalid conversation" };
  }
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId.data, buyerId: user.id },
    select: { id: true },
  });
  if (!conversation) return { success: false, error: "Conversation not found" };
  const result = await prisma.message.updateMany({
    where: {
      conversationId: conversation.id,
      senderId: { not: user.id },
      readAt: null,
    },
    data: { readAt: new Date() },
  });
  revalidatePath("/dashboard/messages");
  revalidatePath("/dashboard");
  return { success: true, data: { updated: result.count } };
}

export async function markSellerConversationRead(
  conversationIdInput: unknown
): Promise<ActionResult<{ updated: number }>> {
  const { user } = await requirePageRoles([UserRole.SELLER]);
  const conversationId = z.string().trim().min(1).max(128).safeParse(conversationIdInput);
  if (!conversationId.success) return { success: false, error: "Invalid conversation" };
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId.data, sellerId: user.id },
    select: { id: true },
  });
  if (!conversation) return { success: false, error: "Conversation not found" };
  const result = await prisma.message.updateMany({
    where: {
      conversationId: conversation.id,
      senderId: { not: user.id },
      readAt: null,
    },
    data: { readAt: new Date() },
  });
  revalidatePath("/seller/messages");
  revalidatePath("/dashboard");
  return { success: true, data: { updated: result.count } };
}

export async function reportConversation(
  conversationIdInput: unknown,
  reasonInput: unknown,
  detailsInput: unknown
): Promise<ActionResult<{ reportId: string }>> {
  const { user } = await requirePageSession();
  const conversationId = z.string().trim().min(1).max(128).safeParse(conversationIdInput);
  const reason = z.enum(ConversationReportReason).safeParse(reasonInput);
  const details = z.string().trim().max(1000).safeParse(detailsInput);
  if (!conversationId.success || !reason.success || !details.success) {
    return { success: false, error: "Choose a report reason and enter valid details" };
  }
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId.data,
      OR: [{ buyerId: user.id }, { sellerId: user.id }],
    },
    select: { id: true, sellerId: true },
  });
  if (!conversation) return { success: false, error: "Conversation not found" };
  try {
    const report = await prisma.conversationReport.create({
      data: {
        conversationId: conversation.id,
        reporterId: user.id,
        reason: reason.data,
        details: details.data || null,
      },
      select: { id: true },
    });
    revalidatePath("/support/console/conversation-reports");
    return { success: true, data: { reportId: report.id } };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "You have already reported this conversation" };
    }
    throw error;
  }
}

export async function uploadConversationAttachment(
  conversationIdInput: unknown,
  fileInput: File
): Promise<ActionResult<MessageAttachment>> {
  const { user } = await requirePageSession();
  const conversationId = z.string().trim().min(1).max(128).safeParse(conversationIdInput);
  if (!conversationId.success) return { success: false, error: "Invalid conversation" };
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId.data,
      OR: [{ buyerId: user.id }, { sellerId: user.id }],
    },
    select: { id: true, sellerId: true },
  });
  if (!conversation) return { success: false, error: "Conversation not found" };
  if (conversation.sellerId === user.id) {
    const seller = await prisma.sellerProfile.findUnique({
      where: { userId: user.id },
      select: { status: true },
    });
    if (seller?.status !== "APPROVED") {
      return { success: false, error: "An approved seller profile is required" };
    }
  }
  if (!process.env.UPLOADTHING_TOKEN) {
    return { success: false, error: "Attachments are not configured" };
  }
  if (!(fileInput instanceof File)) return { success: false, error: "Choose a file to attach" };
  const contentType = z.enum(MESSAGE_ATTACHMENT_TYPES).safeParse(fileInput.type);
  if (!contentType.success) {
    return { success: false, error: "Attach a JPEG, PNG, WebP image, or PDF" };
  }
  if (fileInput.size < 1 || fileInput.size > MAX_MESSAGE_ATTACHMENT_SIZE) {
    return { success: false, error: "Attachments must be 5 MB or smaller" };
  }
  if (!(await hasValidUploadSignature(fileInput))) {
    return { success: false, error: "The file content does not match the selected attachment type" };
  }
  const result = await new UTApi().uploadFiles(fileInput);
  if (result.error) {
    return { success: false, error: "Attachment upload failed. Please try again." };
  }
  return {
    success: true,
    data: {
      url: result.data.ufsUrl ?? result.data.url,
      name: result.data.name,
      size: result.data.size,
      contentType: contentType.data,
    },
  };
}

export async function confirmBuyerReceipt(
  orderItemIdInput: unknown
): Promise<ActionResult<{ completed: true }>> {
  const { user } = await requirePageSession();
  const orderItemId = z.string().trim().min(1).max(128).safeParse(orderItemIdInput);
  if (!orderItemId.success) return { success: false, error: "Invalid order item" };
  const item = await prisma.orderItem.findFirst({
    where: {
      id: orderItemId.data,
      order: { buyerId: user.id },
    },
    select: {
      id: true,
      orderId: true,
      status: true,
      order: { select: { status: true } },
      disputes: {
        where: { status: { in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] } },
        select: { id: true },
        take: 1,
      },
      deliveries: {
        where: { status: DeliveryStatus.DELIVERED },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 1,
        select: { id: true },
      },
    },
  });
  if (
    !item ||
    !item.deliveries[0] ||
    !canConfirmBuyerReceipt({
      itemStatus: item.status,
      orderStatus: item.order.status,
      hasActiveDispute: item.disputes.length > 0,
    })
  ) {
    return { success: false, error: "This delivery cannot be confirmed" };
  }
  let completed: boolean;
  try {
    completed = await prisma.$transaction(async (transaction) => {
      const changed = await transaction.orderItem.updateMany({
        where: {
          id: item.id,
          status: OrderItemStatus.DELIVERED,
          order: {
            buyerId: user.id,
            status: { in: [OrderStatus.PAID, OrderStatus.PROCESSING] },
          },
          disputes: {
            none: { status: { in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] } },
          },
        },
        data: { status: OrderItemStatus.COMPLETED },
      });
      if (changed.count !== 1) return false;
      const deliveryChanged = await transaction.delivery.updateMany({
        where: { id: item.deliveries[0].id, status: DeliveryStatus.DELIVERED },
        data: { status: DeliveryStatus.ACCEPTED, acceptedAt: new Date() },
      });
      if (deliveryChanged.count !== 1) {
        throw new Error("ORDER_TRANSITION_CONFLICT");
      }
      await transaction.auditLog.create({
        data: {
          actorId: user.id,
          action: "order.item.completed",
          entityType: "OrderItem",
          entityId: item.id,
          metadata: {
            orderId: item.orderId,
            from: OrderItemStatus.DELIVERED,
            to: OrderItemStatus.COMPLETED,
            deliveryFrom: DeliveryStatus.DELIVERED,
            deliveryTo: DeliveryStatus.ACCEPTED,
          },
        },
      });
      const remaining = await transaction.orderItem.count({
        where: {
          orderId: item.orderId,
          status: { notIn: [OrderItemStatus.COMPLETED, OrderItemStatus.CANCELLED, OrderItemStatus.REFUNDED] },
        },
      });
      if (remaining === 0) {
        const orderChanged = await transaction.order.updateMany({
          where: {
            id: item.orderId,
            buyerId: user.id,
            status: { in: [OrderStatus.PAID, OrderStatus.PROCESSING] },
          },
          data: { status: OrderStatus.COMPLETED, completedAt: new Date() },
        });
        if (orderChanged.count === 1) {
          await transaction.auditLog.create({
            data: {
              actorId: user.id,
              action: "order.status_changed",
              entityType: "Order",
              entityId: item.orderId,
              metadata: {
                from: item.order.status,
                to: OrderStatus.COMPLETED,
                reason: "all_items_confirmed",
              },
            },
          });
        } else {
          const currentOrder = await transaction.order.findUnique({
            where: { id: item.orderId },
            select: { status: true },
          });
          if (currentOrder?.status !== OrderStatus.COMPLETED) {
            throw new Error("ORDER_TRANSITION_CONFLICT");
          }
        }
      }
      return true;
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_TRANSITION_CONFLICT") {
      return { success: false, error: "Order item changed; refresh and try again" };
    }
    throw error;
  }
  if (!completed) return { success: false, error: "Order item changed; refresh and try again" };
  revalidatePath("/dashboard/orders");
  revalidatePath(`/dashboard/orders/${item.orderId}`);
  revalidatePath("/dashboard/reviews");
  revalidatePath("/dashboard");
  return { success: true, data: { completed: true } };
}

export async function submitBuyerReview(
  input: unknown
): Promise<ActionResult<{ reviewId: string }>> {
  const { user } = await requirePageSession();
  const parsed = z
    .object({
      orderItemId: z.string().trim().min(1).max(128),
      rating: z.number().int().min(1).max(5),
      comment: z.string().trim().min(1, "Write feedback for your purchase").max(2000),
    })
    .strict()
    .safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid review" };
  }
  const item = await prisma.orderItem.findFirst({
    where: {
      id: parsed.data.orderItemId,
      status: OrderItemStatus.COMPLETED,
      order: { buyerId: user.id, status: OrderStatus.COMPLETED },
    },
    select: {
      id: true,
      sellerId: true,
      listingId: true,
      seller: { select: { slug: true, userId: true } },
      review: { select: { id: true } },
    },
  });
  if (!item) {
    return { success: false, error: "Only completed purchases can be reviewed" };
  }
  if (item.review) return { success: false, error: "This purchase already has a review" };
  try {
    const review = await prisma.$transaction(async (transaction) => {
      const created = await transaction.review.create({
        data: {
          orderItemId: item.id,
          buyerId: user.id,
          sellerId: item.sellerId,
          listingId: item.listingId,
          rating: parsed.data.rating,
          comment: parsed.data.comment || null,
          status: ReviewStatus.PUBLISHED,
        },
        select: { id: true },
      });
      await enqueueUserNotification(transaction, {
        userId: item.seller.userId,
        type: NotificationType.REVIEW,
        title: "You received a new review",
        body: `A buyer left a ${parsed.data.rating}-star review.`,
        eventKey: `review-published:${created.id}`,
        data: { reviewId: created.id, recipientWorkspace: "SELLER" },
      });
      await transaction.auditLog.create({
        data: {
          actorId: user.id,
          action: "review.submitted",
          entityType: "Review",
          entityId: created.id,
          metadata: {
            orderItemId: item.id,
            sellerId: item.sellerId,
            rating: parsed.data.rating,
          },
        },
      });
      return created;
    });
    revalidatePath("/dashboard/reviews");
    revalidatePath("/dashboard");
    revalidatePath("/admin/reviews");
    revalidatePath("/seller/reviews");
    revalidatePath(`/shops/${item.seller.slug}`);
    return { success: true, data: { reviewId: review.id } };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "This purchase already has a review" };
    }
    throw error;
  }
}

export async function reportReview(
  reviewIdInput: unknown,
  reasonInput: unknown,
  detailsInput: unknown
): Promise<ActionResult<{ reportId: string }>> {
  const { user } = await requirePageSession();
  const reviewId = z.string().trim().min(1).max(128).safeParse(reviewIdInput);
  const reason = z.nativeEnum(ReviewReportReason).safeParse(reasonInput);
  const details = z.string().trim().max(1000).safeParse(detailsInput);
  if (!reviewId.success || !reason.success || !details.success) {
    return { success: false, error: "Invalid review report" };
  }
  const review = await prisma.review.findFirst({
    where: {
      id: reviewId.data,
      status: ReviewStatus.PUBLISHED,
      buyerId: { not: user.id },
    },
    select: { id: true, seller: { select: { userId: true } } },
  });
  if (!review) return { success: false, error: "This review cannot be reported" };
  if (review.seller.userId === user.id) {
    return { success: false, error: "You cannot report a review of your own shop" };
  }
  try {
    const report = await prisma.$transaction(async (transaction) => {
      const created = await transaction.reviewReport.create({
        data: {
          reviewId: review.id,
          reporterId: user.id,
          reason: reason.data,
          details: details.data || null,
        },
        select: { id: true },
      });
      await transaction.auditLog.create({
        data: {
          actorId: user.id,
          action: "review.reported",
          entityType: "Review",
          entityId: review.id,
          metadata: { reportId: created.id, reason: reason.data },
        },
      });
      return created;
    });
    revalidatePath("/admin/reviews");
    return { success: true, data: { reportId: report.id } };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "You have already reported this review" };
    }
    throw error;
  }
}

export async function markBuyerNotificationRead(
  notificationIdInput: unknown
): Promise<ActionResult<{ updated: boolean }>> {
  const { user } = await requirePageSession();
  const notificationId = z.string().trim().min(1).max(128).safeParse(notificationIdInput);
  if (!notificationId.success) {
    return { success: false, error: "Invalid notification" };
  }
  const updated = await prisma.notification.updateMany({
    where: { id: notificationId.data, userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/dashboard/notifications");
  revalidatePath("/seller/notifications");
  revalidatePath("/support/console/notifications");
  revalidatePath("/dashboard");
  return { success: true, data: { updated: updated.count === 1 } };
}

export async function updateBuyerProfile(
  input: unknown
): Promise<ActionResult<{ saved: true }>> {
  const { user } = await requirePageSession();
  const parsed = z
    .object({
      name: z.string().trim().min(1).max(80),
      username: z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/),
      image: z.union([z.literal(""), z.string().url().max(500)]),
      bio: z.string().trim().max(500),
      locale: z.string().trim().min(2).max(16),
      countryCode: z.union([z.literal(""), z.string().regex(/^[A-Z]{2}$/)]),
      preferredCurrency: z.enum(["USD", "EUR", "GBP", "CAD", "AUD"]),
      emailNotifications: z.boolean(),
    })
    .strict()
    .safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid profile" };
  }
  if (parsed.data.image && !parsed.data.image.startsWith("https://")) {
    return { success: false, error: "Avatar URL must use HTTPS" };
  }
  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { name: parsed.data.name, image: parsed.data.image || null },
      }),
      prisma.accountProfile.upsert({
        where: { userId: user.id },
        update: {
          username: parsed.data.username,
          displayName: parsed.data.name,
          bio: parsed.data.bio || null,
          locale: parsed.data.locale,
          countryCode: parsed.data.countryCode || null,
          preferredCurrency: parsed.data.preferredCurrency,
          emailNotifications: parsed.data.emailNotifications,
        },
        create: {
          userId: user.id,
          username: parsed.data.username,
          displayName: parsed.data.name,
          bio: parsed.data.bio || null,
          locale: parsed.data.locale,
          countryCode: parsed.data.countryCode || null,
          preferredCurrency: parsed.data.preferredCurrency,
          emailNotifications: parsed.data.emailNotifications,
        },
      }),
    ]);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "That username is already in use" };
    }
    throw error;
  }
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");
  return { success: true, data: { saved: true } };
}

export async function createBuyerSupportTicket(
  input: unknown
): Promise<ActionResult<{ ticketId: string }>> {
  const { user } = await requirePageSession();
  const parsed = z
    .object({
      orderId: z.string().trim().max(128).optional(),
      subject: z.string().trim().min(5).max(120),
      message: z.string().trim().min(5).max(3000),
    })
    .strict()
    .safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid support request",
    };
  }
  if (credentialPattern.test(parsed.data.message)) {
    return {
      success: false,
      error: "Do not include account passwords or recovery codes in support requests",
    };
  }
  if (parsed.data.orderId) {
    const order = await prisma.order.findFirst({
      where: { id: parsed.data.orderId, buyerId: user.id },
      select: { id: true },
    });
    if (!order) return { success: false, error: "Order not found" };
  }
  const ticket = await prisma.$transaction(async (transaction) => {
    const createdTicket = await transaction.supportTicket.create({
      data: {
        userId: user.id,
        orderId: parsed.data.orderId || null,
        subject: parsed.data.subject,
        messages: {
          create: { senderId: user.id, body: parsed.data.message },
        },
      },
      select: { id: true },
    });
    const supportUsers = await transaction.user.findMany({
      where: {
        roleAssignments: {
          some: { role: { key: { in: [UserRole.SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN] } } },
        },
      },
      select: { id: true },
    });
    for (const supportUser of supportUsers) {
      await enqueueUserNotification(transaction, {
        userId: supportUser.id,
        type: NotificationType.SUPPORT_UPDATE,
        title: "New support ticket",
        body: parsed.data.subject,
        eventKey: `support-ticket-opened:${createdTicket.id}`,
        data: { ticketId: createdTicket.id, recipientWorkspace: "SUPPORT" },
      });
    }
    return createdTicket;
  });
  revalidatePath("/dashboard/support");
  revalidatePath("/support/console");
  return { success: true, data: { ticketId: ticket.id } };
}

export async function replyToBuyerSupportTicket(
  ticketIdInput: unknown,
  bodyInput: unknown
): Promise<ActionResult<{ messageId: string }>> {
  const { user } = await requirePageSession();
  const ticketId = z.string().trim().min(1).max(128).safeParse(ticketIdInput);
  const body = z.string().trim().min(1).max(3000).safeParse(bodyInput);
  if (!ticketId.success || !body.success) {
    return { success: false, error: "Enter a reply up to 3,000 characters" };
  }
  if (credentialPattern.test(body.data)) {
    return {
      success: false,
      error: "Do not include account passwords or recovery codes in support requests",
    };
  }
  const ticket = await prisma.supportTicket.findFirst({
    where: {
      id: ticketId.data,
      userId: user.id,
      status: { notIn: [SupportTicketStatus.CLOSED, SupportTicketStatus.RESOLVED] },
    },
    select: { id: true },
  });
  if (!ticket) return { success: false, error: "This support ticket is not open for replies" };
  const message = await prisma.$transaction(async (transaction) => {
    const created = await transaction.supportTicketMessage.create({
      data: { ticketId: ticket.id, senderId: user.id, body: body.data },
      select: { id: true },
    });
    await transaction.supportTicket.update({
      where: { id: ticket.id },
      data: { updatedAt: new Date(), status: SupportTicketStatus.OPEN },
    });
    const supportUsers = await transaction.user.findMany({
      where: {
        roleAssignments: {
          some: { role: { key: { in: [UserRole.SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN] } } },
        },
      },
      select: { id: true },
    });
    for (const supportUser of supportUsers) {
      if (supportUser.id === user.id) continue;
      await enqueueUserNotification(transaction, {
        userId: supportUser.id,
        type: NotificationType.SUPPORT_UPDATE,
        title: "New support ticket reply",
        body: "A customer replied to a support ticket.",
        eventKey: `support-ticket-message:${created.id}`,
        data: { ticketId: ticket.id, recipientWorkspace: "SUPPORT" },
      });
    }
    return created;
  });
  revalidatePath("/dashboard/support");
  revalidatePath("/support/console");
  return { success: true, data: { messageId: message.id } };
}

export async function revokeBuyerOtherSessions(): Promise<ActionResult<{ revoked: true }>> {
  await requirePageSession();
  const result = await getAuth().api.revokeOtherSessions({ headers: await headers() });
  if (!result?.status) return { success: false, error: "Unable to revoke other sessions" };
  revalidatePath("/dashboard/security");
  return { success: true, data: { revoked: true } };
}

export async function createSupportAgentReply(
  ticketIdInput: unknown,
  bodyInput: unknown
): Promise<ActionResult<{ messageId: string }>> {
  const { user } = await requirePageRoles([
    UserRole.SUPPORT,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  ]);
  const ticketId = z.string().trim().min(1).max(128).safeParse(ticketIdInput);
  const body = z.string().trim().min(1).max(3000).safeParse(bodyInput);
  if (!ticketId.success || !body.success) {
    return { success: false, error: "Enter a reply up to 3,000 characters" };
  }
  if (credentialPattern.test(body.data)) {
    return {
      success: false,
      error: "Do not include account passwords or recovery codes in support replies",
    };
  }
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId.data },
    select: { id: true, userId: true, subject: true },
  });
  if (!ticket) return { success: false, error: "Support ticket not found" };
  const message = await prisma.$transaction(async (transaction) => {
    const created = await transaction.supportTicketMessage.create({
      data: { ticketId: ticket.id, senderId: user.id, body: body.data },
      select: { id: true },
    });
    await transaction.supportTicket.update({
      where: { id: ticket.id },
      data: {
        updatedAt: new Date(),
        status: SupportTicketStatus.IN_PROGRESS,
        resolvedAt: null,
      },
    });
    await enqueueUserNotification(transaction, {
      userId: ticket.userId,
      type: NotificationType.SUPPORT_UPDATE,
      title: "Support replied to your ticket",
      body: ticket.subject,
      eventKey: `support-ticket-message:${created.id}`,
      data: { ticketId: ticket.id },
    });
    return created;
  });
  revalidatePath("/support/console");
  revalidatePath("/dashboard/support");
  return { success: true, data: { messageId: message.id } };
}

export async function updateSupportTicketStatus(
  ticketIdInput: unknown,
  statusInput: unknown
): Promise<ActionResult<{ updated: true }>> {
  const { user } = await requirePageRoles([UserRole.SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const ticketId = z.string().trim().min(1).max(128).safeParse(ticketIdInput);
  const status = z.nativeEnum(SupportTicketStatus).safeParse(statusInput);
  if (!ticketId.success || !status.success) {
    return { success: false, error: "Invalid ticket status" };
  }
  const updated = await prisma.$transaction(async (transaction) => {
    const ticket = await transaction.supportTicket.findUnique({
      where: { id: ticketId.data },
      select: { id: true, userId: true, subject: true, status: true },
    });
    if (!ticket) return 0;
    if (ticket.status === status.data) return 1;
    const changed = await transaction.supportTicket.updateMany({
      where: { id: ticket.id, status: ticket.status },
      data: {
        status: status.data,
        resolvedAt: status.data === SupportTicketStatus.RESOLVED ||
          status.data === SupportTicketStatus.CLOSED
          ? new Date()
          : null,
      },
    });
    if (!changed.count) return 0;
    const event = await transaction.auditLog.create({
      data: {
        actorId: user.id,
        action: "support.ticket.status_updated",
        entityType: "SupportTicket",
        entityId: ticket.id,
        metadata: { previousStatus: ticket.status, status: status.data },
      },
      select: { id: true },
    });
    await enqueueUserNotification(transaction, {
      userId: ticket.userId,
      type: NotificationType.SUPPORT_UPDATE,
      title: "Support ticket updated",
      body: `Your ticket "${ticket.subject}" is now ${status.data.toLowerCase().replaceAll("_", " ")}.`,
      eventKey: `support-ticket-status:${event.id}`,
      data: { ticketId: ticket.id },
    });
    return changed.count;
  });
  if (!updated) return { success: false, error: "Support ticket not found or changed" };
  revalidatePath("/support/console");
  revalidatePath("/dashboard/support");
  return { success: true, data: { updated: true } };
}
