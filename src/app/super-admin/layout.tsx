import {
  Activity,
  ClipboardList,
  KeyRound,
  Shield,
  Users,
} from "lucide-react";
import { UserRole } from "@/generated/prisma/enums";
import { requirePageRoles } from "@/lib/authorization";
import { WorkspaceShell } from "@/components/workspace-shell";

const navigation = [
  { href: "/super-admin", label: "Overview", icon: Activity },
  { href: "/super-admin/administrators", label: "Administrators", icon: Shield },
  { href: "/super-admin/support-staff", label: "Support staff", icon: Users },
  { href: "/super-admin/audit-logs", label: "Audit logs", icon: ClipboardList },
  { href: "/super-admin/roles", label: "Role structure", icon: KeyRound },
];

export default async function SuperAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requirePageRoles([UserRole.SUPER_ADMIN]);

  return (
    <WorkspaceShell
      homeHref="/super-admin"
      homeLabel="GameTrade"
      description="Platform administration"
      navigationLabel="Super administrator navigation"
      navigation={navigation}
      footerTitle="Privileged workspace"
      footerDescription="Role changes are audited. Financial records are not editable here."
    >
      {children}
    </WorkspaceShell>
  );
}
