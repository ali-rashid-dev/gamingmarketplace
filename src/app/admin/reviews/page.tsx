import { ReviewReportStatus, UserRole } from "@/generated/prisma/enums";
import { requirePageRoles } from "@/lib/authorization";
import prisma from "@/lib/prisma";
import { ReviewReportQueue } from "./review-report-queue";

export default async function AdminReviewModerationPage() {
  await requirePageRoles([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const reports = await prisma.reviewReport.findMany({
    where: { status: ReviewReportStatus.OPEN },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 100,
    select: {
      id: true,
      reason: true,
      details: true,
      createdAt: true,
      reporter: { select: { name: true } },
      review: {
        select: {
          id: true,
          rating: true,
          comment: true,
          status: true,
          buyer: { select: { name: true } },
          seller: { select: { shopName: true } },
        },
      },
    },
  });

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Trust & safety</p>
      <h1 className="mt-2 font-display text-3xl font-semibold">Review moderation</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Investigate reports and hide or restore reviews. Every moderation decision is audited.
      </p>
      <ReviewReportQueue reports={reports} />
    </main>
  );
}
