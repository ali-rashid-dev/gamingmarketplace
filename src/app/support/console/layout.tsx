import { requirePageRoles } from "@/lib/authorization";
import { UserRole } from "@/generated/prisma/enums";
import { SupportShell } from "./support-shell";
import prisma from "@/lib/prisma";

export default async function SupportConsoleLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user } = await requirePageRoles([UserRole.SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const unreadNotifications = await prisma.notification.count({
    where: { userId: user.id, channel: "IN_APP", readAt: null },
  });
  return <SupportShell unreadNotifications={unreadNotifications}>{children}</SupportShell>;
}
