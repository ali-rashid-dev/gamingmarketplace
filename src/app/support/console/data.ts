import {
  DisputeStatus,
  SupportReportStatus,
  SupportTicketPriority,
  SupportTicketStatus,
  UserRole,
} from "@/generated/prisma/enums";
import prisma from "@/lib/prisma";
import { getActiveRoles, requirePageRoles } from "@/lib/authorization";

const supportRoles = [UserRole.SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN] as const;
const activeTicketStatuses = [SupportTicketStatus.OPEN, SupportTicketStatus.IN_PROGRESS];
const activeDisputeStatuses = [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW];
const OVERDUE_AFTER_HOURS = 24;

export async function getSupportDashboard() {
  await requirePageRoles(supportRoles);
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const overdueBefore = new Date(now.getTime() - OVERDUE_AFTER_HOURS * 60 * 60 * 1000);
  const [
    openTickets,
    unassignedTickets,
    assignedTickets,
    highPriorityTickets,
    pendingDisputes,
    overdueTickets,
    resolvedToday,
    openReports,
    recentTickets,
    recentDisputes,
  ] = await Promise.all([
    prisma.supportTicket.count({ where: { status: { in: activeTicketStatuses } } }),
    prisma.supportTicket.count({
      where: { status: { in: activeTicketStatuses }, assignedToId: null },
    }),
    prisma.supportTicket.count({
      where: { status: { in: activeTicketStatuses }, assignedToId: { not: null } },
    }),
    prisma.supportTicket.count({
      where: {
        status: { in: activeTicketStatuses },
        priority: { in: [SupportTicketPriority.HIGH, SupportTicketPriority.URGENT] },
      },
    }),
    prisma.dispute.count({ where: { status: { in: activeDisputeStatuses } } }),
    prisma.supportTicket.count({
      where: { status: { in: activeTicketStatuses }, updatedAt: { lt: overdueBefore } },
    }),
    prisma.supportTicket.count({
      where: {
        status: { in: [SupportTicketStatus.RESOLVED, SupportTicketStatus.CLOSED] },
        resolvedAt: { gte: today },
      },
    }),
    prisma.supportReport.count({
      where: { status: { in: [SupportReportStatus.OPEN, SupportReportStatus.INVESTIGATING] } },
    }),
    prisma.supportTicket.findMany({
      where: { status: { in: activeTicketStatuses } },
      orderBy: [{ priority: "desc" }, { updatedAt: "asc" }, { id: "asc" }],
      take: 8,
      select: {
        id: true,
        subject: true,
        status: true,
        priority: true,
        updatedAt: true,
        user: { select: { name: true } },
        assignedTo: { select: { name: true } },
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
      openTickets,
      unassignedTickets,
      assignedTickets,
      highPriorityTickets,
      pendingDisputes,
      overdueTickets,
      resolvedToday,
      openReports,
      overdueAfterHours: OVERDUE_AFTER_HOURS,
    },
    recentTickets,
    recentDisputes,
  };
}

export async function getSupportAgents() {
  await requirePageRoles(supportRoles);
  return prisma.user.findMany({
    where: {
      roleAssignments: { some: { role: { key: UserRole.SUPPORT } } },
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: { id: true, name: true, supportAgentProfile: { select: { isAvailable: true } } },
  });
}

export async function getSupportTickets({
  page = 1,
  status = "ALL",
  assignment = "ALL",
}: {
  page?: number;
  status?: string;
  assignment?: string;
} = {}) {
  const { user } = await requirePageRoles(supportRoles);
  const where = {
    ...(status !== "ALL" && Object.values(SupportTicketStatus).includes(status as SupportTicketStatus)
      ? { status: status as SupportTicketStatus }
      : {}),
    ...(assignment === "MINE" ? { assignedToId: user.id } : {}),
    ...(assignment === "UNASSIGNED" ? { assignedToId: null } : {}),
  };
  const pageSize = 25;
  const totalCount = await prisma.supportTicket.count({ where });
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const tickets = await prisma.supportTicket.findMany({
      where,
      orderBy: [{ priority: "desc" }, { updatedAt: "asc" }, { id: "asc" }],
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        subject: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { name: true, email: true } },
        order: { select: { orderNumber: true } },
        assignedTo: { select: { id: true, name: true } },
        _count: { select: { messages: true } },
      },
    });
  return { tickets, totalCount, page: currentPage, pageCount };
}

export async function getSupportTicket(ticketId: string) {
  await requirePageRoles(supportRoles);
  return prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      subject: true,
      status: true,
      priority: true,
      createdAt: true,
      updatedAt: true,
      resolvedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          roleAssignments: { select: { role: { select: { key: true } } } },
        },
      },
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          placedAt: true,
          buyerId: true,
          items: {
            select: {
              id: true,
              listingTitle: true,
              status: true,
              totalPrice: true,
              currency: true,
              seller: { select: { user: { select: { id: true, name: true, email: true } } } },
            },
          },
        },
      },
      assignedTo: { select: { id: true, name: true } },
      messages: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 100,
        select: {
          id: true,
          body: true,
          isInternal: true,
          createdAt: true,
          sender: {
            select: {
              id: true,
              name: true,
              roleAssignments: { select: { role: { select: { key: true } } } },
            },
          },
        },
      },
    },
  });
}

export async function getSupportDisputes(status?: string) {
  await requirePageRoles(supportRoles);
  const where = status && Object.values(DisputeStatus).includes(status as DisputeStatus)
    ? { status: status as DisputeStatus }
    : { status: { in: activeDisputeStatuses } };
  return prisma.dispute.findMany({
    where,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 100,
    select: {
      id: true,
      reason: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          buyer: { select: { name: true } },
        },
      },
      openedBy: { select: { name: true } },
      orderItem: { select: { listingTitle: true, seller: { select: { user: { select: { name: true } } } } } },
    },
  });
}

export async function getSupportDispute(disputeId: string) {
  await requirePageRoles(supportRoles);
  return prisma.dispute.findUnique({
    where: { id: disputeId },
    select: {
      id: true,
      reason: true,
      description: true,
      status: true,
      resolution: true,
      createdAt: true,
      updatedAt: true,
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          placedAt: true,
          buyer: { select: { id: true, name: true, email: true } },
          items: {
            select: {
              id: true,
              listingTitle: true,
              status: true,
              totalPrice: true,
              currency: true,
              seller: { select: { user: { select: { id: true, name: true, email: true } } } },
              deliveries: { select: { status: true, deliveredAt: true } },
            },
          },
          messages: {
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            take: 100,
            select: { id: true, body: true, senderId: true, createdAt: true },
          },
        },
      },
      openedBy: { select: { id: true, name: true, email: true } },
      orderItem: { select: { listingTitle: true } },
      evidence: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          url: true,
          description: true,
          createdAt: true,
          submittedBy: {
            select: {
              name: true,
              roleAssignments: { select: { role: { select: { key: true } } } },
            },
          },
        },
      },
    },
  });
}

export async function searchSupportOrders(query: string) {
  await requirePageRoles(supportRoles);
  const term = query.trim().slice(0, 100);
  if (!term) return [];
  return prisma.order.findMany({
    where: {
      OR: [
        { orderNumber: { contains: term, mode: "insensitive" } },
        { buyer: { email: { contains: term, mode: "insensitive" } } },
        { buyer: { name: { contains: term, mode: "insensitive" } } },
        { items: { some: { seller: { user: { email: { contains: term, mode: "insensitive" } } } } } },
      ],
    },
    orderBy: [{ placedAt: "desc" }, { id: "desc" }],
    take: 30,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      placedAt: true,
      total: true,
      currency: true,
      buyer: { select: { id: true, name: true, email: true } },
      items: {
        select: {
          id: true,
          listingTitle: true,
          status: true,
          totalPrice: true,
          currency: true,
          seller: { select: { user: { select: { id: true, name: true, email: true } } } },
          deliveries: { select: { status: true, deliveredAt: true } },
        },
      },
    },
  });
}

export async function searchSupportUsers(query: string) {
  await requirePageRoles(supportRoles);
  const term = query.trim().slice(0, 100);
  if (term.length < 2) return [];
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: term, mode: "insensitive" } },
        { name: { contains: term, mode: "insensitive" } },
        { id: term },
      ],
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: 25,
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      sellerProfile: { select: { shopName: true, status: true } },
      _count: { select: { orders: true, supportTickets: true } },
      roleAssignments: { select: { role: { select: { key: true } } } },
    },
  });
  return users.map(({ roleAssignments, ...user }) => ({
    ...user,
    roles: roleAssignments.map(({ role }) => role.key),
  }));
}

export async function getSupportReports() {
  await requirePageRoles(supportRoles);
  return prisma.supportReport.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    take: 100,
    select: {
      id: true,
      category: true,
      status: true,
      details: true,
      createdAt: true,
      submittedBy: { select: { name: true } },
      reportedUser: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { name: true } },
      order: { select: { orderNumber: true } },
    },
  });
}

export async function getSupportProfile() {
  const { user } = await requirePageRoles(supportRoles);
  const [profile, ticketCounts, roles] = await Promise.all([
    prisma.supportAgentProfile.findUnique({
      where: { userId: user.id },
      select: { isAvailable: true, createdAt: true, updatedAt: true },
    }),
    prisma.supportTicket.count({ where: { assignedToId: user.id, status: { in: activeTicketStatuses } } }),
    getActiveRoles(user.id),
  ]);
  return {
    user: { id: user.id, name: user.name, email: user.email, role: roles.join(", ") },
    isAvailable: profile?.isAvailable ?? true,
    assignedOpenTickets: ticketCounts,
  };
}
