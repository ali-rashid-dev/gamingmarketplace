import Link from "next/link";
import { requirePageRoles } from "@/lib/authorization";
import { UserRole } from "@/generated/prisma/enums";
import { DashboardLogout } from "@/app/dashboard/dashboard-logout";

export default async function SupportConsoleLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requirePageRoles([UserRole.SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/support/console" className="font-display font-semibold">GameTrade <span className="text-gold">Support</span></Link>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">My account</Link>
            <DashboardLogout />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">{children}</main>
    </div>
  );
}
