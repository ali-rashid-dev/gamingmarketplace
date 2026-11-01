import { UserRole } from "@/generated/prisma/enums";
import { NotificationList } from "@/app/dashboard/notifications/notification-list";
import { requirePageRoles } from "@/lib/authorization";
import prisma from "@/lib/prisma";

export default async function SupportNotificationsPage() {
  const { user } = await requirePageRoles([UserRole.SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id, channel: "IN_APP" },
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

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Support operations</p>
      <h1 className="mt-2 font-display text-3xl font-semibold">Notifications</h1>
      <p className="mt-2 text-sm text-muted-foreground">Ticket activity and updates for your support workspace.</p>
      <NotificationList notifications={notifications} />
    </main>
  );
}
