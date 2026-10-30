import { requirePageRoles } from "@/lib/authorization";
import { SupportTicketStatus, UserRole } from "@/generated/prisma/enums";
import prisma from "@/lib/prisma";
import { SupportConsole } from "./support-console";

const PAGE_SIZE = 50;

const ticketSelection = {
  id: true,
  subject: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { name: true, email: true } },
  order: { select: { orderNumber: true } },
  messages: {
    orderBy: [{ createdAt: "desc" as const }, { id: "desc" as const }],
    take: 100,
    select: { id: true, senderId: true, body: true, createdAt: true, sender: { select: { name: true, role: true } } },
  },
};

type Props = { searchParams: Promise<{ page?: string }> };

export default async function SupportConsolePage({ searchParams }: Props) {
  await requirePageRoles([UserRole.SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const params = await searchParams;
  const requestedPage = params.page && /^\d+$/.test(params.page) ? Number(params.page) : 1;
  const actionableStatuses = [SupportTicketStatus.OPEN, SupportTicketStatus.IN_PROGRESS];
  const [totalCount, actionableCount] = await Promise.all([
    prisma.supportTicket.count(),
    prisma.supportTicket.count({ where: { status: { in: actionableStatuses } } }),
  ]);
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  const offset = (page - 1) * PAGE_SIZE;
  const actionableOnPage = Math.min(PAGE_SIZE, Math.max(0, actionableCount - offset));
  const inactiveOffset = Math.max(0, offset - actionableCount);
  const [actionableTickets, inactiveTickets] = await Promise.all([
    actionableOnPage > 0
      ? prisma.supportTicket.findMany({
          where: { status: { in: actionableStatuses } },
          orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
          skip: offset,
          take: actionableOnPage,
          select: ticketSelection,
        })
      : Promise.resolve([]),
    actionableOnPage < PAGE_SIZE
      ? prisma.supportTicket.findMany({
          where: { status: { in: [SupportTicketStatus.RESOLVED, SupportTicketStatus.CLOSED] } },
          orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
          skip: inactiveOffset,
          take: PAGE_SIZE - actionableOnPage,
          select: ticketSelection,
        })
      : Promise.resolve([]),
  ]);
  const tickets = [...actionableTickets, ...inactiveTickets].map((ticket) => ({
    ...ticket,
    messages: [...ticket.messages].reverse(),
  }));
  return <SupportConsole tickets={tickets} page={page} pageCount={pageCount} totalCount={totalCount} />;
}
