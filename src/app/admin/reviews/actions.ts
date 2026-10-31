"use server";

import { ReviewReportStatus, ReviewStatus, UserRole } from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import { requirePageRoles } from "@/lib/authorization";
import type { ActionResult } from "@/lib/action-result";
import prisma from "@/lib/prisma";
import { z } from "zod";

export async function moderateReportedReview(
  reportIdInput: unknown,
  decisionInput: unknown
): Promise<ActionResult<{ updated: true }>> {
  const { user } = await requirePageRoles([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const reportId = z.string().trim().min(1).max(128).safeParse(reportIdInput);
  const decision = z.enum(["hide", "publish", "resolve", "dismiss"]).safeParse(decisionInput);
  if (!reportId.success || !decision.success) {
    return { success: false, error: "Invalid review moderation action" };
  }
  const report = await prisma.reviewReport.findFirst({
    where: { id: reportId.data, status: ReviewReportStatus.OPEN },
    select: {
      id: true,
      reviewId: true,
      review: {
        select: {
          status: true,
          seller: { select: { slug: true } },
        },
      },
    },
  });
  if (!report) return { success: false, error: "Open review report not found" };

  const updated = await prisma.$transaction(async (transaction) => {
    if (decision.data === "hide" || decision.data === "publish") {
      const nextStatus =
        decision.data === "hide" ? ReviewStatus.HIDDEN : ReviewStatus.PUBLISHED;
      if (report.review.status !== nextStatus) {
        const reviewChanged = await transaction.review.updateMany({
          where: { id: report.reviewId, status: report.review.status },
          data: { status: nextStatus },
        });
        if (reviewChanged.count !== 1) return false;
        await transaction.auditLog.create({
          data: {
            actorId: user.id,
            action: decision.data === "hide" ? "review.hidden" : "review.published",
            entityType: "Review",
            entityId: report.reviewId,
            metadata: { from: report.review.status, to: nextStatus, reportId: report.id },
          },
        });
      }
    }

    const reportStatus =
      decision.data === "dismiss"
        ? ReviewReportStatus.DISMISSED
        : ReviewReportStatus.RESOLVED;
    const reportChanged = await transaction.reviewReport.updateMany({
      where: { id: report.id, status: ReviewReportStatus.OPEN },
      data: { status: reportStatus },
    });
    if (reportChanged.count !== 1) return false;
    await transaction.auditLog.create({
      data: {
        actorId: user.id,
        action: `review.report.${decision.data}`,
        entityType: "ReviewReport",
        entityId: report.id,
        metadata: { reviewId: report.reviewId },
      },
    });
    return true;
  });
  if (!updated) return { success: false, error: "Report changed; reload and try again" };
  revalidatePath("/admin/reviews");
  revalidatePath("/seller/reviews");
  revalidatePath(`/shops/${report.review.seller.slug}`);
  return { success: true, data: { updated: true } };
}
