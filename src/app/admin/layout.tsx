import { UserRole } from "@/generated/prisma/enums";
import { requirePageRoles } from "@/lib/authorization";
import {
  WorkspaceShell,
  type WorkspaceNavigationItem,
} from "@/components/workspace-shell";

const navigation = [
  { href: "/admin", label: "Overview", icon: "LayoutDashboard" },
  { href: "/admin/sellers", label: "Seller applications", icon: "Store" },
  { href: "/admin/catalog", label: "Games & categories", icon: "Gamepad2" },
  { href: "/admin/listings", label: "Listing moderation", icon: "ClipboardCheck" },
  { href: "/admin/reviews", label: "Review moderation", icon: "MessageSquareWarning" },
  { href: "/support/console", label: "Support & disputes", icon: "Headset" },
] satisfies WorkspaceNavigationItem[];

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requirePageRoles([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  return (
    <WorkspaceShell
      homeHref="/admin"
      homeLabel="GameTrade"
      description="Marketplace management"
      navigationLabel="Admin navigation"
      navigation={navigation}
      footerTitle="Operations workspace"
      footerDescription="Marketplace tools only. Administrator privileges and system security are managed separately."
    >
      {children}
    </WorkspaceShell>
  );
}
