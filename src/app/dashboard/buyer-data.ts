import {
  DisputeStatus,
  OrderItemStatus,
  OrderStatus,
  PaymentStatus,
} from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";

const activeOrderStatuses = [OrderStatus.PAID, OrderStatus.PROCESSING];

export async function getBuyerOverview(userId: string) {
  const [totalOrders, activeOrders, completedOrders] = await Promise.all([
    prisma.order.count({ where: { buyerId: userId } }),
    prisma.order.count({
      where: { buyerId: userId, status: { in: activeOrderStatuses } },
    }),
    prisma.order.count({
      where: { buyerId: userId, status: OrderStatus.COMPLETED },
    }),
  ]);
  const [openDisputes, pendingReviews, unreadMessages, wishlistCount] =
    await Promise.all([
      prisma.dispute.count({
        where: {
          order: { buyerId: userId },
          status: { in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] },
        },
      }),
      prisma.orderItem.count({
        where: {
          status: OrderItemStatus.COMPLETED,
          review: null,
          order: { buyerId: userId },
        },
      }),
      prisma.message.count({
        where: {
          senderId: { not: userId },
          readAt: null,
          conversation: { buyerId: userId },
        },
      }),
      prisma.wishlistItem.count({ where: { userId } }),
    ]);
  const [recentOrders, recentConversations, spending] = await Promise.all([
    prisma.order.findMany({
      where: { buyerId: userId },
      orderBy: [{ placedAt: "desc" }, { id: "desc" }],
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        currency: true,
        placedAt: true,
        items: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          take: 1,
          select: { listingTitle: true, status: true },
        },
        _count: { select: { items: true } },
      },
    }),
    prisma.conversation.findMany({
      where: { buyerId: userId },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 3,
      select: {
        id: true,
        updatedAt: true,
        seller: { select: { name: true } },
        order: { select: { orderNumber: true } },
        messages: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 1,
          select: { body: true, senderId: true, createdAt: true, readAt: true },
        },
      },
    }),
    prisma.payment.groupBy({
      by: ["currency"],
      where: {
        status: PaymentStatus.SUCCEEDED,
        order: { buyerId: userId },
      },
      _sum: { amount: true },
    }),
  ]);

  return {
    metrics: {
      totalOrders,
      activeOrders,
      completedOrders,
      openDisputes,
      pendingReviews,
      unreadMessages,
      wishlistCount,
    },
    recentOrders: recentOrders.map((order) => ({
      ...order,
      total: order.total.toString(),
    })),
    recentConversations,
    spending: spending.map((entry) => ({
      currency: entry.currency,
      amount: entry._sum.amount?.toString() ?? "0",
    })),
  };
}

export type BuyerOrderFilter =
  | "ALL"
  | "PENDING"
  | "PROCESSING"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "DISPUTED";

export async function getBuyerOrders(
  userId: string,
  filter: BuyerOrderFilter = "ALL",
  search = ""
) {
  const statusWhere: Prisma.OrderWhereInput = {
    PENDING: { status: OrderStatus.AWAITING_PAYMENT },
    PROCESSING: { status: { in: activeOrderStatuses } },
    DELIVERED: { items: { some: { status: OrderItemStatus.DELIVERED } } },
    COMPLETED: { status: OrderStatus.COMPLETED },
    CANCELLED: { status: { in: [OrderStatus.CANCELLED, OrderStatus.REFUNDED] } },
    DISPUTED: {
      disputes: {
        some: { status: { in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] } },
      },
    },
    ALL: {},
  }[filter];
  const query = search.trim();

  return prisma.order.findMany({
    where: {
      buyerId: userId,
      ...statusWhere,
      ...(query
        ? {
            OR: [
              { orderNumber: { contains: query, mode: "insensitive" } },
              { items: { some: { listingTitle: { contains: query, mode: "insensitive" } } } },
            ],
          }
        : {}),
    },
    orderBy: [{ placedAt: "desc" }, { id: "desc" }],
    take: 100,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      total: true,
      currency: true,
      placedAt: true,
      items: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          listingTitle: true,
          status: true,
          quantity: true,
          totalPrice: true,
          currency: true,
          deliveries: {
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: 1,
            select: { status: true },
          },
        },
      },
    },
  }).then((orders) =>
    orders.map((order) => ({
      ...order,
      total: order.total.toString(),
      items: order.items.map((item) => ({
        ...item,
        totalPrice: item.totalPrice.toString(),
      })),
    }))
  );
}

export async function getBuyerOrder(userId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, buyerId: userId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      subtotal: true,
      fees: true,
      total: true,
      currency: true,
      placedAt: true,
      completedAt: true,
      items: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          listingTitle: true,
          listingSnapshot: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          currency: true,
          status: true,
          seller: { select: { shopName: true, user: { select: { id: true, name: true } } } },
          deliveries: {
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            select: {
              id: true,
              status: true,
              instructions: true,
              details: true,
              deliveredAt: true,
              acceptedAt: true,
            },
          },
          disputes: {
            where: {
              status: { in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] },
            },
            select: { id: true, status: true, reason: true, createdAt: true },
          },
          review: { select: { id: true, rating: true, comment: true } },
        },
      },
      payments: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: { id: true, status: true, amount: true, currency: true, paidAt: true },
      },
    },
  });
  if (!order) return null;
  return {
    ...order,
    subtotal: order.subtotal.toString(),
    fees: order.fees.toString(),
    total: order.total.toString(),
    items: order.items.map((item) => ({
      ...item,
      unitPrice: item.unitPrice.toString(),
      totalPrice: item.totalPrice.toString(),
    })),
    payments: order.payments.map((payment) => ({
      ...payment,
      amount: payment.amount.toString(),
    })),
  };
}

export async function getBuyerConversations(userId: string) {
  return prisma.conversation.findMany({
    where: { buyerId: userId },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 100,
    select: {
      id: true,
      updatedAt: true,
      seller: { select: { name: true } },
      order: { select: { id: true, orderNumber: true } },
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
  }).then((conversations) =>
    conversations.map((conversation) => ({
      ...conversation,
      unreadCount: conversation._count.messages,
      messages: [...conversation.messages].reverse(),
    }))
  );
}

export async function getBuyerReviews(userId: string) {
  const [reviews, eligibleItems] = await Promise.all([
    prisma.review.findMany({
      where: { buyerId: userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100,
      select: {
        id: true,
        rating: true,
        comment: true,
        status: true,
        sellerResponse: true,
        createdAt: true,
        listing: { select: { title: true } },
        orderItem: { select: { listingTitle: true, order: { select: { id: true, orderNumber: true } } } },
      },
    }),
    prisma.orderItem.findMany({
      where: {
        status: OrderItemStatus.COMPLETED,
        review: null,
        order: { buyerId: userId, status: OrderStatus.COMPLETED },
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 50,
      select: {
        id: true,
        listingTitle: true,
        order: { select: { orderNumber: true } },
      },
    }),
  ]);
  return { reviews, eligibleItems };
}

export async function getBuyerWishlist(userId: string) {
  return prisma.wishlistItem.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      createdAt: true,
      listing: {
        select: {
          id: true,
          title: true,
          price: true,
          currency: true,
          status: true,
          quantity: true,
          expiresAt: true,
          publishedAt: true,
          images: true,
          game: { select: { name: true, status: true } },
          category: { select: { name: true, isActive: true } },
          seller: { select: { status: true, isAvailable: true } },
        },
      },
    },
  }).then((items) =>
    items.map((item) => ({
      ...item,
      listing: { ...item.listing, price: item.listing.price.toString() },
    }))
  );
}

export async function getBuyerNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId, channel: "IN_APP" },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 100,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      data: true,
      readAt: true,
      createdAt: true,
    },
  });
}

export async function getBuyerPayments(userId: string) {
  return prisma.payment.findMany({
    where: { order: { buyerId: userId } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 100,
    select: {
      id: true,
      status: true,
      amount: true,
      currency: true,
      paidAt: true,
      createdAt: true,
      order: { select: { id: true, orderNumber: true } },
    },
  }).then((payments) =>
    payments.map((payment) => ({ ...payment, amount: payment.amount.toString() }))
  );
}

export async function getBuyerProfile(userId: string) {
  return prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      image: true,
      emailVerified: true,
      profile: {
        select: {
          username: true,
          displayName: true,
          bio: true,
          locale: true,
          preferredCurrency: true,
          emailNotifications: true,
          countryCode: true,
        },
      },
    },
  });
}

export async function getBuyerSessions(userId: string, currentSessionId: string) {
  const sessions = await prisma.session.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      expiresAt: true,
      ipAddress: true,
      userAgent: true,
    },
  });
  return sessions.map((session) => ({
    ...session,
    current: session.id === currentSessionId,
  }));
}

export async function getBuyerSupportTickets(userId: string) {
  return prisma.supportTicket.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 100,
    select: {
      id: true,
      subject: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      order: { select: { orderNumber: true } },
      messages: {
        where: { isInternal: false },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: 100,
        select: { id: true, senderId: true, body: true, createdAt: true },
      },
    },
  });
}
