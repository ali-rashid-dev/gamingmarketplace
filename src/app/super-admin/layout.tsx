import {
  Activity,
  ClipboardList,
  KeyRound,
  Shield,
  Users,
} from "lucide-react";
import Link from "next/link";
import { UserRole } from "@/generated/prisma/enums";
import { requirePageRoles } from "@/lib/authorization";

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
    <div className="min-h-screen md:flex">
      <aside className="border-b border-border bg-card md:flex md:w-64 md:shrink-0 md:flex-col md:border-b-0 md:border-r">
        <div className="border-b border-border px-5 py-5">
          <Link href="/super-admin" className="font-display text-xl font-semibold text-primary">
            GameTrade
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">Platform administration</p>
        </div>
        <nav aria-label="Super administrator navigation" className="flex gap-1 overflow-x-auto p-3 md:flex-1 md:flex-col">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex shrink-0 items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="hidden border-t border-border p-4 md:block">
          <p className="text-xs font-medium text-foreground">Privileged workspace</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Role changes are audited. Financial records are not editable here.
          </p>
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
