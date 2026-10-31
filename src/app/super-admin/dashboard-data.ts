import {
  DisputeStatus,
  ListingStatus,
  OrderStatus,
  SupportTicketStatus,
  UserRole,
} from "@/generated/prisma/enums";
import prisma from "@/lib/prisma";

const revenueOrderStatuses = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.COMPLETED,
];

export async function getSuperAdminOverview() {
  const [
    users,
    administrators,
    supportStaff,
    orders,
    feeTotals,
    pendingListings,
    openDisputes,
    openTickets,
    recentAuditLogs,
    databaseProbe,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] } } }),
    prisma.user.count({ where: { role: UserRole.SUPPORT } }),
    prisma.order.count(),
    prisma.order.groupBy({
      by: ["currency"],
      where: { status: { in: revenueOrderStatuses } },
      _sum: { fees: true },
      orderBy: { currency: "asc" },
    }),
    prisma.listing.count({ where: { status: ListingStatus.PENDING_REVIEW } }),
    prisma.dispute.count({
      where: { status: { in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] } },
    }),
    prisma.supportTicket.count({
      where: { status: { in: [SupportTicketStatus.OPEN, SupportTicketStatus.IN_PROGRESS] } },
    }),
    prisma.auditLog.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 8,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        createdAt: true,
        actor: { select: { name: true, email: true } },
      },
    }),
    prisma.$queryRaw<{ ready: number }[]>`SELECT 1 AS ready`,
  ]);

  return {
    metrics: {
      users,
      administrators,
      supportStaff,
      orders,
      platformFees: feeTotals.map(
        ({ currency, _sum }) => `${currency} ${_sum.fees?.toFixed(2) ?? "0.00"}`
      ),
      pendingListings,
      openDisputes,
      openTickets,
      databaseReady: databaseProbe[0]?.ready === 1,
    },
    recentAuditLogs,
  };
}

export async function getPrivilegedUsers(
  group: "administrators" | "support",
  query: string
) {
  const term = query.trim();
  return prisma.user.findMany({
    where: term
      ? {
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { email: { contains: term, mode: "insensitive" } },
          ],
        }
      : group === "administrators"
        ? { role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] } }
        : { role: UserRole.SUPPORT },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: 50,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      createdAt: true,
      _count: { select: { sessions: true } },
    },
  });
}
