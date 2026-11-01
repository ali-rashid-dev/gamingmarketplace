import { UserRole } from "@/generated/prisma/enums";
import { requirePageRoles } from "@/lib/authorization";
import prisma from "@/lib/prisma";
import { SellerShell } from "./seller-shell";

export default async function SellerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user } = await requirePageRoles([UserRole.SELLER]);
  const unreadNotifications = await prisma.notification.count({
    where: { userId: user.id, channel: "IN_APP", readAt: null },
  });
  return <SellerShell unreadNotifications={unreadNotifications}>{children}</SellerShell>;
}
