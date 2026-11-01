"use server";

import {
  DisputeStatus,
  ConversationReportStatus,
  SupportReportCategory,
  SupportReportStatus,
  SupportTicketPriority,
  SupportTicketStatus,
  UserRole,
} from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import { requirePageRoles } from "@/lib/authorization";
import type { ActionResult } from "@/lib/action-result";
import prisma from "@/lib/prisma";
import { z } from "zod";

const supportRoles = [UserRole.SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN] as const;
const credentialPattern =
  /(?:password|passcode|recovery\s+code|backup\s+code|login\s+credentials?)\s*[:=]\s*\S+/i;

export async function assignSupportTicket(
  ticketIdInput: unknown,
  assigneeIdInput: unknown
): Promise<ActionResult<{ updated: true }>> {
  const { user } = await requirePageRoles(supportRoles);
  const ticketId = z.string().trim().min(1).max(128).safeParse(ticketIdInput);
  const assigneeId = z.union([z.literal(""), z.string().trim().min(1).max(128)]).safeParse(assigneeIdInput);
  if (!ticketId.success || !assigneeId.success) {
    return { success: false, error: "Invalid ticket assignment" };
  }
  const targetId = assigneeId.data || null;
  if (targetId) {
    const target = await prisma.user.findFirst({
      where: {
        id: targetId,
        roleAssignments: { some: { role: { key: UserRole.SUPPORT } } },
      },
      select: { id: true },
    });
    if (!target) return { success: false, error: "Choose an active support agent" };
  }
  const updated = await prisma.$transaction(async (transaction) => {
    const ticket = await transaction.supportTicket.findUnique({
      where: { id: ticketId.data },
      select: { status: true },
    });
    if (!ticket) return 0;
    const isActive =
      ticket.status === SupportTicketStatus.OPEN ||
      ticket.status === SupportTicketStatus.IN_PROGRESS;
    const changed = await transaction.supportTicket.updateMany({
      where: { id: ticketId.data },
      data: {
        assignedToId: targetId,
        ...(targetId && isActive
          ? { status: SupportTicketStatus.IN_PROGRESS, resolvedAt: null }
          : {}),
      },
    });
    if (changed.count) {
      await transaction.auditLog.create({
        data: {
          actorId: user.id,
          action: "support.ticket.assigned",
          entityType: "SupportTicket",
          entityId: ticketId.data,
          metadata: { assigneeId: targetId },
        },
      });
    }
    return changed.count;
  });
  if (!updated) return { success: false, error: "Support ticket not found" };
  revalidateSupport();
  return { success: true, data: { updated: true } };
}

export async function updateSupportTicketPriority(
  ticketIdInput: unknown,
  priorityInput: unknown
): Promise<ActionResult<{ updated: true }>> {
  const { user } = await requirePageRoles(supportRoles);
  const ticketId = z.string().trim().min(1).max(128).safeParse(ticketIdInput);
  const priority = z.nativeEnum(SupportTicketPriority).safeParse(priorityInput);
  if (!ticketId.success || !priority.success) {
    return { success: false, error: "Invalid ticket priority" };
  }
  const updated = await prisma.supportTicket.updateMany({
    where: { id: ticketId.data },
    data: { priority: priority.data },
  });
  if (!updated.count) return { success: false, error: "Support ticket not found" };
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "support.ticket.priority_updated",
      entityType: "SupportTicket",
      entityId: ticketId.data,
      metadata: { priority: priority.data },
    },
  });
  revalidateSupport();
  return { success: true, data: { updated: true } };
}

export async function addSupportInternalNote(
  ticketIdInput: unknown,
  bodyInput: unknown
): Promise<ActionResult<{ messageId: string }>> {
  const { user } = await requirePageRoles(supportRoles);
  const ticketId = z.string().trim().min(1).max(128).safeParse(ticketIdInput);
  const body = z.string().trim().min(1).max(3000).safeParse(bodyInput);
  if (!ticketId.success || !body.success) {
    return { success: false, error: "Enter an internal note up to 3,000 characters" };
  }
  if (credentialPattern.test(body.data)) {
    return { success: false, error: "Do not record passwords or recovery codes in notes" };
  }
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId.data },
    select: { id: true },
  });
  if (!ticket) return { success: false, error: "Support ticket not found" };
  const note = await prisma.$transaction(async (transaction) => {
    const created = await transaction.supportTicketMessage.create({
      data: { ticketId: ticket.id, senderId: user.id, body: body.data, isInternal: true },
      select: { id: true },
    });
    await transaction.supportTicket.update({
      where: { id: ticket.id },
      data: { updatedAt: new Date() },
    });
    await transaction.auditLog.create({
      data: {
        actorId: user.id,
        action: "support.ticket.internal_note_added",
        entityType: "SupportTicket",
        entityId: ticket.id,
        metadata: { messageId: created.id },
      },
    });
    return created;
  });
  revalidateSupport();
  return { success: true, data: { messageId: note.id } };
}

export async function requestSupportTicketEvidence(
  ticketIdInput: unknown,
  requestInput: unknown
): Promise<ActionResult<{ messageId: string }>> {
  const { user } = await requirePageRoles(supportRoles);
  const ticketId = z.string().trim().min(1).max(128).safeParse(ticketIdInput);
  const request = z.string().trim().min(5).max(2000).safeParse(requestInput);
  if (!ticketId.success || !request.success) {
    return { success: false, error: "Describe the evidence you need (5–2,000 characters)" };
  }
  if (credentialPattern.test(request.data)) {
    return { success: false, error: "Do not request passwords or recovery codes" };
  }
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId.data },
    select: { id: true, userId: true, subject: true },
  });
  if (!ticket) return { success: false, error: "Support ticket not found" };
  const message = await prisma.$transaction(async (transaction) => {
    const created = await transaction.supportTicketMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: user.id,
        body: `Please provide the following evidence:\n\n${request.data}`,
      },
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
    await transaction.notification.create({
      data: {
        userId: ticket.userId,
        type: "SYSTEM",
        title: "Support requested more information",
        body: ticket.subject,
        data: { ticketId: ticket.id },
      },
    });
    return created;
  });
  revalidateSupport();
  return { success: true, data: { messageId: message.id } };
}

export async function escalateSupportDispute(
  disputeIdInput: unknown
): Promise<ActionResult<{ updated: true }>> {
  const { user } = await requirePageRoles(supportRoles);
  const disputeId = z.string().trim().min(1).max(128).safeParse(disputeIdInput);
  if (!disputeId.success) return { success: false, error: "Invalid dispute" };
  const dispute = await prisma.dispute.findFirst({
    where: {
      id: disputeId.data,
      status: { in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] },
    },
    select: {
      id: true,
      orderId: true,
      openedById: true,
      order: { select: { buyerId: true, items: { select: { seller: { select: { userId: true } } } } } },
    },
  });
  if (!dispute) return { success: false, error: "Open dispute not found" };
  await prisma.$transaction(async (transaction) => {
    await transaction.dispute.update({
      where: { id: dispute.id },
      data: { status: DisputeStatus.UNDER_REVIEW },
    });
    await transaction.auditLog.create({
      data: {
        actorId: user.id,
        action: "support.dispute.escalated",
        entityType: "Dispute",
        entityId: dispute.id,
        metadata: { orderId: dispute.orderId },
      },
    });
  });
  revalidatePath("/support/console/disputes");
  revalidatePath(`/support/console/disputes/${dispute.id}`);
  return { success: true, data: { updated: true } };
}

export async function requestDisputeEvidence(
  disputeIdInput: unknown,
  requestInput: unknown
): Promise<ActionResult<{ notified: number }>> {
  const { user } = await requirePageRoles(supportRoles);
  const disputeId = z.string().trim().min(1).max(128).safeParse(disputeIdInput);
  const request = z.string().trim().min(5).max(2000).safeParse(requestInput);
  if (!disputeId.success || !request.success) {
    return { success: false, error: "Describe the evidence needed (5–2,000 characters)" };
  }
  if (credentialPattern.test(request.data)) {
    return { success: false, error: "Do not request passwords or recovery codes" };
  }
  const dispute = await prisma.dispute.findFirst({
    where: {
      id: disputeId.data,
      status: { in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] },
    },
    select: {
      id: true,
      orderId: true,
      order: {
        select: {
          buyerId: true,
          items: { select: { seller: { select: { userId: true } } } },
        },
      },
    },
  });
  if (!dispute) return { success: false, error: "Open dispute not found" };
  const recipientIds = Array.from(new Set([
    dispute.order.buyerId,
    ...dispute.order.items.map((item) => item.seller.userId),
  ]));
  await prisma.$transaction([
    ...recipientIds.map((userId) =>
      prisma.notification.create({
        data: {
          userId,
          type: "DISPUTE_UPDATE",
          title: "Evidence requested for a dispute",
          body: request.data,
          data: { disputeId: dispute.id, orderId: dispute.orderId },
        },
      })
    ),
    prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "support.dispute.evidence_requested",
        entityType: "Dispute",
        entityId: dispute.id,
        metadata: { recipientCount: recipientIds.length },
      },
    }),
  ]);
  revalidatePath("/support/console/disputes");
  revalidatePath(`/support/console/disputes/${dispute.id}`);
  return { success: true, data: { notified: recipientIds.length } };
}

export async function createSupportReport(
  input: unknown
): Promise<ActionResult<{ reportId: string }>> {
  const { user } = await requirePageRoles(supportRoles);
  const parsed = z.object({
    reportedUserId: z.string().trim().min(1).max(128),
    orderId: z.string().trim().max(128).optional(),
    category: z.nativeEnum(SupportReportCategory),
    details: z.string().trim().min(10).max(3000),
  }).strict().safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid report" };
  }
  if (credentialPattern.test(parsed.data.details)) {
    return { success: false, error: "Do not include passwords or recovery codes in reports" };
  }
  const subject = await prisma.user.findUnique({
    where: { id: parsed.data.reportedUserId },
    select: { id: true },
  });
  if (!subject) return { success: false, error: "Reported account not found" };
  const orderId = parsed.data.orderId || null;
  if (orderId) {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        OR: [
          { buyerId: subject.id },
          { items: { some: { seller: { userId: subject.id } } } },
        ],
      },
      select: { id: true },
    });
    if (!order) return { success: false, error: "Order is not associated with this account" };
  }
  const report = await prisma.$transaction(async (transaction) => {
    const created = await transaction.supportReport.create({
      data: {
        submittedById: user.id,
        reportedUserId: subject.id,
        orderId,
        category: parsed.data.category,
        details: parsed.data.details,
      },
      select: { id: true },
    });
    await transaction.auditLog.create({
      data: {
        actorId: user.id,
        action: "support.report.created",
        entityType: "SupportReport",
        entityId: created.id,
        metadata: { category: parsed.data.category, reportedUserId: subject.id },
      },
    });
    return created;
  });
  revalidatePath("/support/console/reports");
  return { success: true, data: { reportId: report.id } };
}

export async function updateSupportReportStatus(
  reportIdInput: unknown,
  statusInput: unknown
): Promise<ActionResult<{ updated: true }>> {
  const { user } = await requirePageRoles(supportRoles);
  const reportId = z.string().trim().min(1).max(128).safeParse(reportIdInput);
  const status = z.nativeEnum(SupportReportStatus).safeParse(statusInput);
  if (!reportId.success || !status.success) {
    return { success: false, error: "Invalid report update" };
  }
  const updated = await prisma.$transaction(async (transaction) => {
    const changed = await transaction.supportReport.updateMany({
      where: { id: reportId.data },
      data: { status: status.data },
    });
    if (changed.count) {
      await transaction.auditLog.create({
        data: {
          actorId: user.id,
          action: "support.report.status_updated",
          entityType: "SupportReport",
          entityId: reportId.data,
          metadata: { status: status.data },
        },
      });
    }
    return changed.count;
  });
  if (!updated) return { success: false, error: "Report not found" };
  revalidatePath("/support/console/reports");
  return { success: true, data: { updated: true } };
}

export async function updateSupportAvailability(
  isAvailableInput: unknown
): Promise<ActionResult<{ isAvailable: boolean }>> {
  const { user } = await requirePageRoles(supportRoles);
  const isAvailable = z.boolean().safeParse(isAvailableInput);
  if (!isAvailable.success) return { success: false, error: "Invalid availability status" };
  const profile = await prisma.supportAgentProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, isAvailable: isAvailable.data },
    update: { isAvailable: isAvailable.data },
    select: { isAvailable: true },
  });
  revalidatePath("/support/console/profile");
  revalidatePath("/support/console");
  return { success: true, data: profile };
}

function revalidateSupport() {
  revalidatePath("/support/console");
  revalidatePath("/support/console/tickets");
  revalidatePath("/dashboard/support");
}

export async function moderateConversationReport(
  reportIdInput: unknown,
  decisionInput: unknown
): Promise<ActionResult<{ updated: true }>> {
  const { user } = await requirePageRoles(supportRoles);
  const reportId = z.string().trim().min(1).max(128).safeParse(reportIdInput);
  const decision = z.enum(["resolve", "dismiss"]).safeParse(decisionInput);
  if (!reportId.success || !decision.success) {
    return { success: false, error: "Invalid conversation report action" };
  }
  const status = decision.data === "resolve"
    ? ConversationReportStatus.RESOLVED
    : ConversationReportStatus.DISMISSED;
  const report = await prisma.conversationReport.findFirst({
    where: { id: reportId.data, status: ConversationReportStatus.OPEN },
    select: { id: true, conversationId: true },
  });
  if (!report) return { success: false, error: "Open conversation report not found" };

  const updated = await prisma.$transaction(async (transaction) => {
    const changed = await transaction.conversationReport.updateMany({
      where: { id: report.id, status: ConversationReportStatus.OPEN },
      data: { status, reviewedById: user.id, reviewedAt: new Date() },
    });
    if (changed.count !== 1) return false;
    await transaction.auditLog.create({
      data: {
        actorId: user.id,
        action: `conversation.report.${decision.data}`,
        entityType: "ConversationReport",
        entityId: report.id,
        metadata: { conversationId: report.conversationId },
      },
    });
    return true;
  });
  if (!updated) return { success: false, error: "Report changed; reload and try again" };
  revalidateSupport();
  revalidatePath("/support/console/conversation-reports");
  return { success: true, data: { updated: true } };
}
