import { UserRole } from "@/generated/prisma/enums";
import { NotificationList } from "@/app/dashboard/notifications/notification-list";
import { requirePageRoles } from "@/lib/authorization";
import prisma from "@/lib/prisma";

export default async function SellerNotificationsPage() {
  const { user } = await requirePageRoles([UserRole.SELLER]);
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
    <main className="mx-auto max-w-5xl px-5 py-9 sm:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Seller workspace</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-white">Notifications</h1>
      <p className="mt-2 text-sm text-slate-400">Message and account updates for your shop.</p>
      <NotificationList notifications={notifications} />
    </main>
  );
}
