import {
  DisputeStatus,
  ListingStatus,
  OrderStatus,
  SellerStatus,
  SupportTicketStatus,
  UserRole,
} from "@/generated/prisma/enums";
import prisma from "@/lib/prisma";

const activeOrderStatuses = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.COMPLETED,
];
const activeDisputeStatuses = [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW];

export async function getAdminDashboard() {
  const [
    totalUsers,
    totalOrders,
    feeTotals,
    pendingDisputes,
    pendingListings,
    pendingSellers,
    openTickets,
    recentListings,
    recentDisputes,
  ] = await Promise.all([
    prisma.user.count({
      where: {
        roleAssignments: {
          some: { role: { key: { in: [UserRole.BUYER, UserRole.SELLER] } } },
        },
      },
    }),
    prisma.order.count(),
    prisma.order.groupBy({
      by: ["currency"],
      where: { status: { in: activeOrderStatuses } },
      _sum: { fees: true },
      orderBy: { currency: "asc" },
    }),
    prisma.dispute.count({ where: { status: { in: activeDisputeStatuses } } }),
    prisma.listing.count({ where: { status: ListingStatus.PENDING_REVIEW } }),
    prisma.sellerProfile.count({ where: { status: SellerStatus.PENDING } }),
    prisma.supportTicket.count({
      where: {
        status: { in: [SupportTicketStatus.OPEN, SupportTicketStatus.IN_PROGRESS] },
      },
    }),
    prisma.listing.findMany({
      where: { status: ListingStatus.PENDING_REVIEW },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: 5,
      select: {
        id: true,
        title: true,
        createdAt: true,
        seller: { select: { shopName: true } },
        game: { select: { name: true } },
      },
    }),
    prisma.dispute.findMany({
      where: { status: { in: activeDisputeStatuses } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: 5,
      select: {
        id: true,
        reason: true,
        status: true,
        createdAt: true,
        order: { select: { orderNumber: true } },
        openedBy: { select: { name: true } },
      },
    }),
  ]);

  return {
    metrics: {
      totalUsers,
      totalOrders,
      platformRevenue: feeTotals.map(
        ({ currency, _sum }) => `${currency} ${_sum.fees?.toFixed(2) ?? "0.00"}`
      ),
      pendingDisputes,
      pendingListings,
      pendingSellers,
      openTickets,
    },
    recentListings,
    recentDisputes,
  };
}
