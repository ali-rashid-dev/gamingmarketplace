import { UserRole } from "@/generated/prisma/enums";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NotificationList } from "@/app/dashboard/notifications/notification-list";
import { requirePageRoles } from "@/lib/authorization";
import prisma from "@/lib/prisma";

const PAGE_SIZE = 100;

function parsePage(pageParam: string | string[] | undefined) {
  const rawPage = Array.isArray(pageParam) ? pageParam[0] : pageParam;
  if (!rawPage || !/^\d+$/.test(rawPage)) return 1;
  const page = Number(rawPage);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export default async function SupportNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const { user } = await requirePageRoles([UserRole.SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const params = await searchParams;
  const where = { userId: user.id, channel: "IN_APP" as const };
  const totalNotifications = await prisma.notification.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalNotifications / PAGE_SIZE));
  const page = Math.min(parsePage(params.page), totalPages);
  const notifications = await prisma.notification.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
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
      {totalPages > 1 && (
        <nav aria-label="Notification pages" className="mt-6 flex items-center justify-between gap-4">
          {page > 1 ? (
            <Button render={<Link href={`/support/console/notifications?page=${page - 1}`} />} nativeButton={false} variant="outline">
              Newer notifications
            </Button>
          ) : <span />}
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          {page < totalPages ? (
            <Button render={<Link href={`/support/console/notifications?page=${page + 1}`} />} nativeButton={false} variant="outline">
              Older notifications
            </Button>
          ) : <span />}
        </nav>
      )}
    </main>
  );
}
