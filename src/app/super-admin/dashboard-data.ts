import { Prisma } from "@/generated/prisma/client";
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

async function withUnavailableFallback<T>(
  operation: string,
  promise: Promise<T>,
  fallback: T
) {
  try {
    return { value: await promise, available: true };
  } catch (error) {
    console.error(`Super-admin overview query failed: ${operation}`, error);
    return { value: fallback, available: false };
  }
}

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
    withUnavailableFallback("users", prisma.user.count(), 0),
    withUnavailableFallback(
      "administrators",
      prisma.user.count({
        where: {
          roleAssignments: {
            some: { role: { key: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] } } },
          },
        },
      }),
      0
    ),
    withUnavailableFallback(
      "support staff",
      prisma.user.count({
        where: {
          roleAssignments: { some: { role: { key: UserRole.SUPPORT } } },
        },
      }),
      0
    ),
    withUnavailableFallback("orders", prisma.order.count(), 0),
    withUnavailableFallback(
      "platform fees",
      prisma.order.groupBy({
        by: ["currency"],
        where: { status: { in: revenueOrderStatuses } },
        _sum: { fees: true },
        orderBy: { currency: "asc" },
      }),
      []
    ),
    withUnavailableFallback(
      "pending listings",
      prisma.listing.count({ where: { status: ListingStatus.PENDING_REVIEW } }),
      0
    ),
    withUnavailableFallback(
      "open disputes",
      prisma.dispute.count({
        where: { status: { in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] } },
      }),
      0
    ),
    withUnavailableFallback(
      "open support tickets",
      prisma.supportTicket.count({
        where: { status: { in: [SupportTicketStatus.OPEN, SupportTicketStatus.IN_PROGRESS] } },
      }),
      0
    ),
    withUnavailableFallback(
      "recent audit activity",
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
      []
    ),
    withUnavailableFallback(
      "database health probe",
      prisma.$queryRaw<{ ready: number }[]>`SELECT 1 AS ready`,
      []
    ),
  ]);

  return {
    metrics: {
      users: users.value,
      administrators: administrators.value,
      supportStaff: supportStaff.value,
      orders: orders.value,
      platformFees: feeTotals.value.map(
        ({ currency, _sum }) => `${currency} ${_sum.fees?.toFixed(2) ?? "0.00"}`
      ),
      pendingListings: pendingListings.value,
      openDisputes: openDisputes.value,
      openTickets: openTickets.value,
      databaseReady:
        users.available &&
        administrators.available &&
        supportStaff.available &&
        orders.available &&
        feeTotals.available &&
        pendingListings.available &&
        openDisputes.available &&
        openTickets.available &&
        recentAuditLogs.available &&
        databaseProbe.available &&
        databaseProbe.value[0]?.ready === 1,
    },
    recentAuditLogs: recentAuditLogs.value,
  };
}

export async function getPrivilegedUsers(
  group: "administrators" | "support",
  query: string
) {
  const term = query.trim();
  const roleFilter: Prisma.UserWhereInput =
    group === "administrators"
      ? {
          roleAssignments: {
            some: { role: { key: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] } } },
          },
        }
      : { roleAssignments: { some: { role: { key: UserRole.SUPPORT } } } };
  const users = await prisma.user.findMany({
    where: term
      ? {
          AND: [
            roleFilter,
            {
              OR: [
                { name: { contains: term, mode: "insensitive" } },
                { email: { contains: term, mode: "insensitive" } },
              ],
            },
          ],
        }
      : roleFilter,
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: 50,
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      createdAt: true,
      _count: { select: { sessions: true } },
      roleAssignments: { select: { role: { select: { key: true } } } },
    },
  });
  return users.map(({ roleAssignments, ...user }) => ({
    ...user,
    roles: roleAssignments.map(({ role }) => role.key),
  }));
}
