import {
  DeliveryStatus,
  DisputeStatus,
  ListingStatus,
  OrderItemStatus,
  OrderStatus,
  ReviewStatus,
  WithdrawalStatus,
} from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import { requireApprovedSeller } from "@/app/seller/listings/listing-data";
import prisma from "@/lib/prisma";

export async function getSellerOverview() {
  const { sellerId } = await requireApprovedSeller();
  const [
    totalOrders,
    sales,
    pendingSales,
    activeListings,
    averageRating,
    reviewCount,
    pendingDeliveries,
    disputedOrders,
    balances,
    pendingWithdrawals,
    latestOrders,
    profile,
  ] = await Promise.all([
    prisma.order.count({
      where: { items: { some: { sellerId } } },
    }),
    prisma.orderItem.groupBy({
      by: ["currency"],
      where: { sellerId, status: OrderItemStatus.COMPLETED },
      _sum: { totalPrice: true },
    }),
    prisma.orderItem.groupBy({
      by: ["currency"],
      where: {
        sellerId,
        status: { in: [OrderItemStatus.PENDING, OrderItemStatus.PROCESSING, OrderItemStatus.DELIVERED] },
        order: { status: { in: ["PAID", "PROCESSING"] } },
      },
      _sum: { totalPrice: true },
    }),
    prisma.listing.count({ where: { sellerId, status: ListingStatus.ACTIVE } }),
    prisma.review.aggregate({
      where: {
        sellerId,
        status: ReviewStatus.PUBLISHED,
        orderItem: {
          status: OrderItemStatus.COMPLETED,
          order: { status: OrderStatus.COMPLETED },
        },
      },
      _avg: { rating: true },
      _count: true,
    }),
    prisma.review.count({
      where: {
        sellerId,
        status: ReviewStatus.PUBLISHED,
        orderItem: {
          status: OrderItemStatus.COMPLETED,
          order: { status: OrderStatus.COMPLETED },
        },
      },
    }),
    prisma.delivery.count({
      where: {
        status: { in: [DeliveryStatus.PENDING, DeliveryStatus.IN_PROGRESS] },
        orderItem: { sellerId },
      },
    }),
    prisma.order.count({
      where: {
        items: {
          some: {
            sellerId,
            disputes: {
              some: {
                status: { in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] },
              },
            },
          },
        },
      },
    }),
    prisma.ledgerEntry.groupBy({
      by: ["currency", "type"],
      where: { sellerId },
      _sum: { amount: true },
    }),
    prisma.withdrawal.groupBy({
      by: ["currency", "status"],
      where: {
        sellerId,
        status: { in: [WithdrawalStatus.REQUESTED, WithdrawalStatus.APPROVED, WithdrawalStatus.PROCESSING] },
      },
      _sum: { amount: true },
    }),
    prisma.orderItem.findMany({
      where: { sellerId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 8,
      select: {
        id: true,
        listingTitle: true,
        totalPrice: true,
        currency: true,
        status: true,
        order: { select: { orderNumber: true, placedAt: true } },
      },
    }),
    prisma.sellerProfile.findUniqueOrThrow({
      where: { id: sellerId },
      select: { shopName: true, status: true, isAvailable: true, verifiedAt: true },
    }),
  ]);
  const currencyCodes = new Set([
    ...sales.map((item) => item.currency),
    ...pendingSales.map((item) => item.currency),
    ...balances.map((item) => item.currency),
  ]);
  const salesByCurrency = sales.map((item) => ({
    currency: item.currency,
    amount: item._sum.totalPrice?.toString() ?? "0",
  }));
  const balanceByCurrency = Array.from(currencyCodes).map((currency) => {
    const credits = balances
      .filter((entry) => entry.currency === currency && entry.type === "CREDIT")
      .reduce(
        (sum, entry) => sum.add(entry._sum.amount ?? 0),
        new Prisma.Decimal(0)
      );
    const debits = balances
      .filter((entry) => entry.currency === currency && entry.type === "DEBIT")
      .reduce(
        (sum, entry) => sum.add(entry._sum.amount ?? 0),
        new Prisma.Decimal(0)
      );
    const pending = pendingWithdrawals
      .filter((entry) => entry.currency === currency)
      .reduce(
        (sum, entry) => sum.add(entry._sum.amount ?? 0),
        new Prisma.Decimal(0)
      );
    return {
      currency,
      available: credits.sub(debits).toFixed(2),
      pendingBalance:
        pendingSales.find((entry) => entry.currency === currency)?._sum.totalPrice?.toString() ??
        "0",
      pendingPayout: pending.toFixed(2),
    };
  });

  return {
    profile,
    metrics: {
      totalOrders,
      salesByCurrency,
      activeListings,
      averageRating: averageRating._avg.rating,
      reviewCount,
      pendingDeliveries,
      disputedOrders,
      balances: balanceByCurrency,
      conversionRate: null,
    },
    latestOrders: latestOrders.map((item) => ({
      ...item,
      totalPrice: item.totalPrice.toString(),
    })),
  };
}

export async function getSellerOrders() {
  const { sellerId } = await requireApprovedSeller();
  const items = await prisma.orderItem.findMany({
    where: { sellerId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 100,
    include: {
      order: {
        select: {
          orderNumber: true,
          status: true,
          placedAt: true,
          buyer: { select: { name: true } },
        },
      },
      deliveries: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true, deliveredAt: true },
      },
      disputes: {
        where: { status: { in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] } },
        select: { id: true, status: true, reason: true },
      },
      listing: { select: { deliveryType: true, deliveryEstimate: true } },
    },
  });
  return items.map((item) => ({
    id: item.id,
    orderNumber: item.order.orderNumber,
    orderStatus: item.order.status,
    buyerName: item.order.buyer.name,
    placedAt: item.order.placedAt,
    listingTitle: item.listingTitle,
    totalPrice: item.totalPrice.toString(),
    currency: item.currency,
    quantity: item.quantity,
    status: item.status,
    delivery: item.deliveries[0] ?? null,
    dispute: item.disputes[0] ?? null,
    deliveryType: item.listing?.deliveryType ?? null,
    deliveryEstimate: item.listing?.deliveryEstimate ?? null,
  }));
}

export async function getSellerConversations() {
  const { userId } = await requireApprovedSeller();
  const conversations = await prisma.conversation.findMany({
    where: { sellerId: userId },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 100,
    include: {
      buyer: { select: { name: true } },
      order: { select: { orderNumber: true } },
      reports: {
        where: { reporterId: userId },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true },
      },
      _count: {
        select: {
          messages: { where: { senderId: { not: userId }, readAt: null } },
        },
      },
      messages: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 100,
        select: {
          id: true,
          senderId: true,
          body: true,
          attachments: true,
          createdAt: true,
          readAt: true,
        },
      },
    },
  });
  return {
    sellerUserId: userId,
    conversations: conversations.map((conversation) => ({
      id: conversation.id,
      buyerName: conversation.buyer.name,
      orderNumber: conversation.order?.orderNumber ?? null,
      updatedAt: conversation.updatedAt,
      unreadCount: conversation._count.messages,
      reports: conversation.reports,
      messages: [...conversation.messages].reverse(),
    })),
  };
}

export async function getSellerReviews() {
  const { sellerId } = await requireApprovedSeller();
  const eligibleReview = {
    status: ReviewStatus.PUBLISHED,
    orderItem: {
      status: OrderItemStatus.COMPLETED,
      order: { status: OrderStatus.COMPLETED },
    },
  };
  const [reviews, summary] = await Promise.all([
    prisma.review.findMany({
      where: { sellerId, ...eligibleReview },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100,
      select: {
        id: true,
        rating: true,
        comment: true,
        sellerResponse: true,
        sellerRespondedAt: true,
        createdAt: true,
        buyer: { select: { name: true } },
        listing: { select: { title: true } },
      },
    }),
    prisma.review.aggregate({
      where: { sellerId, ...eligibleReview },
      _avg: { rating: true },
      _count: true,
    }),
  ]);
  return {
    average: summary._avg.rating,
    count: summary._count,
    reviews,
  };
}

export async function getSellerEarnings() {
  const { sellerId } = await requireApprovedSeller();
  const [ledger, withdrawals, sales] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where: { sellerId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100,
      select: {
        id: true,
        type: true,
        amount: true,
        currency: true,
        sourceType: true,
        description: true,
        createdAt: true,
      },
    }),
    prisma.withdrawal.findMany({
      where: { sellerId },
      orderBy: [{ requestedAt: "desc" }, { id: "desc" }],
      take: 50,
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        requestedAt: true,
        processedAt: true,
      },
    }),
    prisma.orderItem.findMany({
      where: { sellerId, status: OrderItemStatus.COMPLETED },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 100,
      select: {
        id: true,
        listingTitle: true,
        totalPrice: true,
        currency: true,
        updatedAt: true,
        order: { select: { orderNumber: true } },
      },
    }),
  ]);
  return {
    ledger: ledger.map((entry) => ({ ...entry, amount: entry.amount.toString() })),
    withdrawals: withdrawals.map((entry) => ({ ...entry, amount: entry.amount.toString() })),
    sales: sales.map((entry) => ({ ...entry, totalPrice: entry.totalPrice.toString() })),
  };
}

export async function getSellerProfile() {
  const { sellerId, userId } = await requireApprovedSeller();
  return prisma.sellerProfile.findUniqueOrThrow({
    where: { id: sellerId },
    select: {
      shopName: true,
      slug: true,
      description: true,
      isAvailable: true,
      status: true,
      verifiedAt: true,
      createdAt: true,
      user: { select: { name: true, email: true, emailVerified: true } },
    },
  }).then(async (seller) => {
    const profile = await prisma.accountProfile.findUnique({
      where: { userId },
      select: {
        username: true,
        displayName: true,
        bio: true,
        locale: true,
        preferredCurrency: true,
        emailNotifications: true,
      },
    });
    return { ...seller, profile };
  });
}
