"use server";

import {
  DisputeDecision,
  DisputeEventType,
  DisputeReasonCode,
  DisputeStatus,
  OrderItemStatus,
  OrderStatus,
  UserRole,
} from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { getActiveRoles, requirePageSession } from "@/lib/authorization";
import {
  BUYER_PROTECTION_APPEAL_WINDOW_DAYS,
  getBuyerProtectionDeadline,
  getDisputeAppealDeadline,
  isBuyerProtectionOpen,
} from "@/lib/buyer-protection";
import { enforceMessageRateLimit, messageCredentialPattern } from "@/lib/messaging";
import prisma from "@/lib/prisma";
import { UTApi } from "uploadthing/server";
import { z } from "zod";

const activeStatuses = [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW];
const evidenceTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
const maxEvidenceSize = 10 * 1024 * 1024;
const reasonLabels: Record<DisputeReasonCode, string> = {
  NOT_DELIVERED: "Digital goods not delivered",
  INVALID_GOODS: "Goods are invalid or unusable",
  NOT_AS_DESCRIBED: "Goods are not as described",
  OTHER: "Other order issue",
};

function isStaffRole(role: UserRole) {
  return role === UserRole.SUPPORT || role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
}

function isActiveDisputeStatus(status: DisputeStatus) {
  return status === DisputeStatus.OPEN || status === DisputeStatus.UNDER_REVIEW;
}

function revalidateDispute(disputeId?: string, orderId?: string) {
  revalidatePath("/dashboard/orders");
  if (orderId) revalidatePath(`/dashboard/orders/${orderId}`);
  revalidatePath("/dashboard");
  revalidatePath("/seller/disputes");
  revalidatePath("/seller");
  revalidatePath("/support/console/disputes");
  if (disputeId) revalidatePath(`/support/console/disputes/${disputeId}`);
}

export async function openBuyerDispute(
  input: unknown
): Promise<ActionResult<{ disputeId: string }>> {
  const { user } = await requirePageSession();
  const parsed = z.object({
    orderItemId: z.string().trim().min(1).max(128),
    reasonCode: z.nativeEnum(DisputeReasonCode),
    description: z.string().trim().min(10).max(3000),
  }).strict().safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid dispute details" };
  }
  if (messageCredentialPattern.test(parsed.data.description)) {
    return { success: false, error: "Do not include passwords or recovery codes in a dispute" };
  }
  const item = await prisma.orderItem.findFirst({
    where: {
      id: parsed.data.orderItemId,
      order: {
        buyerId: user.id,
        status: { in: [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.COMPLETED, OrderStatus.DISPUTED] },
      },
      status: { notIn: [OrderItemStatus.CANCELLED, OrderItemStatus.REFUNDED] },
    },
    select: {
      id: true,
      orderId: true,
      status: true,
      seller: { select: { userId: true } },
      order: { select: { placedAt: true } },
      deliveries: {
        where: { status: { in: ["DELIVERED", "ACCEPTED"] } },
        orderBy: [{ deliveredAt: "asc" }, { createdAt: "asc" }],
        select: { deliveredAt: true, createdAt: true },
      },
      disputes: { where: { status: { in: activeStatuses } }, select: { id: true }, take: 1 },
    },
  });
  if (!item) return { success: false, error: "This order item is not eligible for buyer protection" };
  if (item.disputes.length) return { success: false, error: "This order item already has an active case" };

  const deliveredAt = item.deliveries
    .map((delivery) => delivery.deliveredAt ?? delivery.createdAt)
    .sort((left, right) => left.getTime() - right.getTime())[0] ?? null;
  const deadlineInput = { placedAt: item.order.placedAt, deliveredAt };
  if (!isBuyerProtectionOpen(deadlineInput)) {
    return { success: false, error: "The buyer-protection window for this order item has ended" };
  }
  if (parsed.data.reasonCode === DisputeReasonCode.NOT_DELIVERED && deliveredAt) {
    return { success: false, error: "Choose a delivery-quality reason for an item already marked delivered" };
  }
  if (parsed.data.reasonCode !== DisputeReasonCode.NOT_DELIVERED && !deliveredAt) {
    return { success: false, error: "Quality disputes can be opened after the item is marked delivered" };
  }

  try {
    const dispute = await prisma.$transaction(async (transaction) => {
      const created = await transaction.dispute.create({
        data: {
          orderId: item.orderId,
          orderItemId: item.id,
          openedById: user.id,
          reasonCode: parsed.data.reasonCode,
          reason: reasonLabels[parsed.data.reasonCode],
          description: parsed.data.description,
          status: DisputeStatus.OPEN,
        },
        select: { id: true },
      });
      await transaction.disputeEvent.create({
        data: {
          disputeId: created.id,
          actorId: user.id,
          type: DisputeEventType.OPENED,
          details: {
            reasonCode: parsed.data.reasonCode,
            protectionDeadline: getBuyerProtectionDeadline(deadlineInput).toISOString(),
          },
        },
      });
      await transaction.notification.create({
        data: {
          userId: item.seller.userId,
          type: "DISPUTE_UPDATE",
          title: "Buyer opened an order case",
          body: reasonLabels[parsed.data.reasonCode],
          data: {
            disputeId: created.id,
            orderId: item.orderId,
            recipientWorkspace: "SELLER",
          },
        },
      });
      await transaction.auditLog.create({
        data: {
          actorId: user.id,
          action: "dispute.opened",
          entityType: "Dispute",
          entityId: created.id,
          metadata: {
            orderId: item.orderId,
            orderItemId: item.id,
            reasonCode: parsed.data.reasonCode,
          },
        },
      });
      return created;
    });
    revalidateDispute(dispute.id, item.orderId);
    return { success: true, data: { disputeId: dispute.id } };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: "This order item already has an active case" };
    }
    throw error;
  }
}

async function getParticipantDispute(disputeId: string, userId: string) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    select: {
      id: true,
      orderId: true,
      orderItemId: true,
      order: {
        select: {
          buyerId: true,
          items: { select: { id: true, seller: { select: { userId: true } } } },
        },
      },
      status: true,
    },
  });
  if (!dispute) return null;
  const roles = await getActiveRoles(userId);
  const isStaff = roles.some(isStaffRole);
  const caseSeller = dispute.order.items.find((item) => item.id === dispute.orderItemId)?.seller.userId;
  const isParticipant = dispute.order.buyerId === userId || caseSeller === userId;
  const participantIds = [dispute.order.buyerId, ...(caseSeller ? [caseSeller] : [])];
  return isStaff || isParticipant ? { ...dispute, isStaff, isParticipant, participantIds } : null;
}

export async function addDisputeMessage(
  disputeIdInput: unknown,
  bodyInput: unknown
): Promise<ActionResult<{ messageId: string }>> {
  const { user } = await requirePageSession();
  const disputeId = z.string().trim().min(1).max(128).safeParse(disputeIdInput);
  const body = z.string().trim().min(1).max(3000).safeParse(bodyInput);
  if (!disputeId.success || !body.success) {
    return { success: false, error: "Enter a response up to 3,000 characters" };
  }
  if (messageCredentialPattern.test(body.data)) {
    return { success: false, error: "Do not include passwords or recovery codes in a dispute response" };
  }
  const dispute = await getParticipantDispute(disputeId.data, user.id);
  if (!dispute) return { success: false, error: "Dispute not found" };
  if (!isActiveDisputeStatus(dispute.status)) {
    return { success: false, error: "Responses are closed for this case" };
  }
  const message = await prisma.$transaction(async (transaction) => {
    if (!(await enforceMessageRateLimit(transaction, user.id))) return null;
    const created = await transaction.disputeMessage.create({
      data: { disputeId: dispute.id, senderId: user.id, body: body.data },
      select: { id: true },
    });
    await transaction.dispute.update({
      where: { id: dispute.id },
      data: { updatedAt: new Date() },
    });
    await transaction.disputeEvent.create({
      data: { disputeId: dispute.id, actorId: user.id, type: DisputeEventType.MESSAGE },
    });
    await transaction.auditLog.create({
      data: {
        actorId: user.id,
        action: "dispute.message_added",
        entityType: "Dispute",
        entityId: dispute.id,
        metadata: { messageId: created.id },
      },
    });
    await transaction.notification.createMany({
      data: Array.from(new Set(dispute.participantIds))
        .filter((recipientId) => recipientId !== user.id)
        .map((userId) => ({
          userId,
          type: "DISPUTE_UPDATE" as const,
          title: "New dispute response",
          body: "A participant added a response to an order case.",
          data: {
            disputeId: dispute.id,
            orderId: dispute.orderId,
            recipientWorkspace: userId === dispute.participantIds[0] ? "BUYER" : "SELLER",
          },
        })),
    });
    return created;
  });
  if (!message) return { success: false, error: "You are sending messages too quickly. Try again in a minute." };
  revalidateDispute(dispute.id, dispute.orderId);
  return { success: true, data: { messageId: message.id } };
}

export async function uploadDisputeEvidence(
  disputeIdInput: unknown,
  fileInput: File,
  descriptionInput: unknown
): Promise<ActionResult<{ evidenceId: string }>> {
  const { user } = await requirePageSession();
  const disputeId = z.string().trim().min(1).max(128).safeParse(disputeIdInput);
  const description = z.string().trim().max(500).safeParse(descriptionInput);
  if (!disputeId.success || !description.success) return { success: false, error: "Invalid evidence details" };
  const dispute = await getParticipantDispute(disputeId.data, user.id);
  if (!dispute) return { success: false, error: "Dispute not found" };
  const current = await prisma.dispute.findFirst({
    where: { id: dispute.id, status: { in: activeStatuses } },
    select: { id: true },
  });
  if (!current) return { success: false, error: "Evidence can only be added to an active case" };
  if (!(fileInput instanceof File)) return { success: false, error: "Choose an evidence file" };
  const contentType = z.enum(evidenceTypes).safeParse(fileInput.type);
  if (!contentType.success) return { success: false, error: "Use a JPEG, PNG, WebP image, or PDF" };
  if (fileInput.size < 1 || fileInput.size > maxEvidenceSize) {
    return { success: false, error: "Evidence files must be 10 MB or smaller" };
  }
  if (!process.env.UPLOADTHING_TOKEN) {
    return { success: false, error: "Evidence uploads are not configured" };
  }
  const upload = await new UTApi().uploadFiles(fileInput);
  if (upload.error) return { success: false, error: "Evidence upload failed. Please try again." };
  const evidence = await prisma.$transaction(async (transaction) => {
    const created = await transaction.disputeEvidence.create({
      data: {
        disputeId: dispute.id,
        submittedById: user.id,
        url: upload.data.ufsUrl ?? upload.data.url,
        description: description.data || null,
        name: upload.data.name,
        contentType: contentType.data,
        size: upload.data.size,
      },
      select: { id: true },
    });
    await transaction.disputeEvent.create({
      data: {
        disputeId: dispute.id,
        actorId: user.id,
        type: DisputeEventType.EVIDENCE_ADDED,
        details: { evidenceId: created.id, name: upload.data.name },
      },
    });
    await transaction.auditLog.create({
      data: {
        actorId: user.id,
        action: "dispute.evidence_added",
        entityType: "Dispute",
        entityId: dispute.id,
        metadata: { evidenceId: created.id, contentType: contentType.data, size: upload.data.size },
      },
    });
    return created;
  });
  revalidateDispute(dispute.id, dispute.orderId);
  return { success: true, data: { evidenceId: evidence.id } };
}

export async function appealDispute(
  disputeIdInput: unknown,
  reasonInput: unknown
): Promise<ActionResult<{ appealed: true }>> {
  const { user } = await requirePageSession();
  const disputeId = z.string().trim().min(1).max(128).safeParse(disputeIdInput);
  const reason = z.string().trim().min(10).max(2000).safeParse(reasonInput);
  if (!disputeId.success || !reason.success) return { success: false, error: "Enter appeal details (10–2,000 characters)" };
  if (messageCredentialPattern.test(reason.data)) return { success: false, error: "Do not include account credentials in an appeal" };
  const dispute = await prisma.dispute.findFirst({
    where: {
      id: disputeId.data,
      order: { buyerId: user.id },
      status: { in: [DisputeStatus.BUYER_FAVOR, DisputeStatus.SELLER_FAVOR, DisputeStatus.RESOLVED, DisputeStatus.CLOSED] },
      appealedAt: null,
      resolvedAt: { not: null },
    },
    select: { id: true, orderId: true, status: true, decision: true, resolution: true, resolvedAt: true },
  });
  if (!dispute || !dispute.resolvedAt) return { success: false, error: "This case is not eligible for appeal" };
  if (getDisputeAppealDeadline(dispute.resolvedAt).getTime() < Date.now()) {
    return { success: false, error: `The appeal window is ${BUYER_PROTECTION_APPEAL_WINDOW_DAYS} days after the decision` };
  }
  const updated = await prisma.$transaction(async (transaction) => {
    const changed = await transaction.dispute.updateMany({
      where: { id: dispute.id, status: dispute.status, appealedAt: null },
      data: { status: DisputeStatus.UNDER_REVIEW, appealedAt: new Date() },
    });
    if (changed.count !== 1) return false;
    await transaction.disputeMessage.create({
      data: { disputeId: dispute.id, senderId: user.id, body: `Appeal: ${reason.data}` },
    });
    await transaction.disputeEvent.create({
      data: {
        disputeId: dispute.id,
        actorId: user.id,
        type: DisputeEventType.APPEALED,
        details: {
          reason: reason.data,
          previousStatus: dispute.status,
          previousDecision: dispute.decision,
          previousResolution: dispute.resolution,
        },
      },
    });
    await transaction.auditLog.create({
      data: {
        actorId: user.id,
        action: "dispute.appealed",
        entityType: "Dispute",
        entityId: dispute.id,
        metadata: { previousStatus: dispute.status },
      },
    });
    return true;
  });
  if (!updated) return { success: false, error: "This case changed; refresh and try again" };
  revalidateDispute(dispute.id, dispute.orderId);
  return { success: true, data: { appealed: true } };
}

export async function assignDispute(
  disputeIdInput: unknown,
  assigneeIdInput: unknown
): Promise<ActionResult<{ assigned: true }>> {
  const { user } = await requirePageSession();
  const roles = await getActiveRoles(user.id);
  if (!roles.some(isStaffRole)) {
    return { success: false, error: "Only authorized support staff can assign cases" };
  }
  const disputeId = z.string().trim().min(1).max(128).safeParse(disputeIdInput);
  const assigneeId = z.string().trim().min(1).max(128).safeParse(assigneeIdInput);
  if (!disputeId.success || !assigneeId.success) return { success: false, error: "Choose a valid support agent" };
  const assignee = await prisma.user.findFirst({
    where: {
      id: assigneeId.data,
      roleAssignments: { some: { role: { key: UserRole.SUPPORT } } },
    },
    select: { id: true },
  });
  if (!assignee) return { success: false, error: "Cases can only be assigned to support agents" };
  const dispute = await prisma.dispute.findFirst({
    where: { id: disputeId.data, status: { in: activeStatuses } },
    select: { id: true, orderId: true },
  });
  if (!dispute) return { success: false, error: "Active case not found" };
  await prisma.$transaction(async (transaction) => {
    await transaction.dispute.update({
      where: { id: dispute.id },
      data: { assignedToId: assignee.id },
    });
    await transaction.disputeEvent.create({
      data: {
        disputeId: dispute.id,
        actorId: user.id,
        type: DisputeEventType.ASSIGNED,
        details: { assigneeId: assignee.id },
      },
    });
    await transaction.auditLog.create({
      data: {
        actorId: user.id,
        action: "dispute.assigned",
        entityType: "Dispute",
        entityId: dispute.id,
        metadata: { assigneeId: assignee.id },
      },
    });
  });
  revalidateDispute(dispute.id, dispute.orderId);
  return { success: true, data: { assigned: true } };
}

export async function decideDispute(
  input: unknown
): Promise<ActionResult<{ decided: true }>> {
  const { user } = await requirePageSession();
  const roles = await getActiveRoles(user.id);
  if (!roles.some(isStaffRole)) {
    return { success: false, error: "Only authorized support staff can decide cases" };
  }
  const parsed = z.object({
    disputeId: z.string().trim().min(1).max(128),
    decision: z.nativeEnum(DisputeDecision),
    resolution: z.string().trim().min(10).max(2000),
    partialAmount: z.string().trim().regex(/^\d{1,10}(\.\d{1,2})?$/).optional(),
  }).strict().safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid decision" };
  const dispute = await prisma.dispute.findFirst({
    where: { id: parsed.data.disputeId, status: { in: activeStatuses } },
    select: {
      id: true,
      orderId: true,
      assignedToId: true,
      order: { select: { buyerId: true } },
      orderItem: { select: { totalPrice: true, seller: { select: { userId: true } } } },
    },
  });
  if (!dispute) return { success: false, error: "Active case not found" };
  const isAdmin = roles.includes(UserRole.ADMIN) || roles.includes(UserRole.SUPER_ADMIN);
  if (dispute.assignedToId && dispute.assignedToId !== user.id && !isAdmin) {
    return { success: false, error: "This case is assigned to another support agent" };
  }
  let decisionAmount: Prisma.Decimal | null = null;
  if (parsed.data.decision === DisputeDecision.FULL_REFUND) {
    if (!dispute.orderItem) return { success: false, error: "This case has no order-item value to refund" };
    decisionAmount = dispute.orderItem.totalPrice;
  } else if (parsed.data.decision === DisputeDecision.PARTIAL_REFUND) {
    if (!parsed.data.partialAmount || !dispute.orderItem) {
      return { success: false, error: "Enter a partial amount for an order-item case" };
    }
    decisionAmount = new Prisma.Decimal(parsed.data.partialAmount);
    if (decisionAmount.lte(0) || decisionAmount.gte(dispute.orderItem.totalPrice)) {
      return { success: false, error: "Partial amount must be positive and less than the item total" };
    }
  }
  if (messageCredentialPattern.test(parsed.data.resolution)) {
    return { success: false, error: "Do not include account credentials in a case decision" };
  }
  const status = parsed.data.decision === DisputeDecision.FULL_REFUND ||
    parsed.data.decision === DisputeDecision.PARTIAL_REFUND
    ? DisputeStatus.BUYER_FAVOR
    : parsed.data.decision === DisputeDecision.RELEASE_TO_SELLER
      ? DisputeStatus.SELLER_FAVOR
      : DisputeStatus.RESOLVED;
  const changed = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.dispute.updateMany({
      where: { id: dispute.id, status: { in: activeStatuses } },
      data: {
        status,
        decision: parsed.data.decision,
        decisionAmount,
        resolution: parsed.data.resolution,
        resolvedAt: new Date(),
      },
    });
    if (updated.count !== 1) return false;
    await transaction.disputeEvent.create({
      data: {
        disputeId: dispute.id,
        actorId: user.id,
        type: DisputeEventType.DECIDED,
        details: {
          decision: parsed.data.decision,
          decisionAmount: decisionAmount?.toString() ?? null,
          status,
          financialMutationPerformed: false,
        },
      },
    });
    await transaction.auditLog.create({
      data: {
        actorId: user.id,
        action: "dispute.decided",
        entityType: "Dispute",
        entityId: dispute.id,
        metadata: {
          decision: parsed.data.decision,
          decisionAmount: decisionAmount?.toString() ?? null,
          status,
          financialMutationPerformed: false,
        },
      },
    });
    await transaction.notification.createMany({
      data: [
        {
          userId: dispute.order.buyerId,
          type: "DISPUTE_UPDATE",
          title: "Support recorded a case decision",
          body: parsed.data.resolution.slice(0, 500),
          data: {
            disputeId: dispute.id,
            orderId: dispute.orderId,
            recipientWorkspace: "BUYER",
          },
        },
        ...(dispute.orderItem?.seller.userId
          ? [{
              userId: dispute.orderItem.seller.userId,
              type: "DISPUTE_UPDATE" as const,
              title: "Support recorded a case decision",
              body: parsed.data.resolution.slice(0, 500),
              data: {
                disputeId: dispute.id,
                orderId: dispute.orderId,
                recipientWorkspace: "SELLER",
              },
            }]
          : []),
      ],
    });
    return true;
  });
  if (!changed) return { success: false, error: "Case changed; refresh and try again" };
  revalidateDispute(dispute.id, dispute.orderId);
  return { success: true, data: { decided: true } };
}
