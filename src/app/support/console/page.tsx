import { requirePageRoles } from "@/lib/authorization";
import { UserRole } from "@/generated/prisma/enums";
import prisma from "@/lib/prisma";
import { SupportConsole } from "./support-console";

export default async function SupportConsolePage() {
  await requirePageRoles([UserRole.SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const tickets = await prisma.supportTicket.findMany({
    orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
    take: 100,
    select: {
      id: true,
      subject: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { name: true, email: true } },
      order: { select: { orderNumber: true } },
      messages: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: 100,
        select: { id: true, senderId: true, body: true, createdAt: true, sender: { select: { name: true, role: true } } },
      },
    },
  });
  return <SupportConsole tickets={tickets} />;
}
