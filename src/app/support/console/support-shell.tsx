"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenText,
  ClipboardList,
  Flag,
  Gavel,
  LayoutDashboard,
  Search,
  UserRound,
  UsersRound,
} from "lucide-react";
import { DashboardLogout } from "@/app/dashboard/dashboard-logout";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const navigation = [
  { label: "Dashboard", href: "/support/console", icon: LayoutDashboard },
  { label: "Tickets", href: "/support/console/tickets", icon: ClipboardList },
  { label: "Disputes", href: "/support/console/disputes", icon: Gavel },
  { label: "Orders", href: "/support/console/orders", icon: Search },
  { label: "Users", href: "/support/console/users", icon: UsersRound },
  { label: "Reports", href: "/support/console/reports", icon: Flag },
  { label: "Knowledge base", href: "/support/console/knowledge-base", icon: BookOpenText },
  { label: "My profile", href: "/support/console/profile", icon: UserRound },
] as const;

function SupportNavigation() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  return (
    <Sidebar className="border-sidebar-border bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link href="/support/console" className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <UsersRound className="size-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-sm font-semibold">Support Desk</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">Customer operations</span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map(({ label, href, icon: Icon }) => {
                const active = pathname === href ||
                  (href !== "/support/console" && pathname.startsWith(`${href}/`));
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      render={<Link href={href} onClick={() => setOpenMobile(false)} />}
                      isActive={active}
                      tooltip={label}
                      className="h-10"
                    >
                      <Icon aria-hidden="true" />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <p className="px-2 text-xs leading-5 text-muted-foreground">
          Support access is limited to customer cases. Financial and administrative controls stay restricted.
        </p>
        <Button
          variant="outline"
          className="w-full"
          render={<Link href="/dashboard" />}
          nativeButton={false}
        >
          My account
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

export function SupportShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider className="min-h-svh bg-background">
      <SupportNavigation />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex min-h-14 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="md:hidden" />
            <p className="truncate text-sm font-medium text-muted-foreground">Support operations</p>
          </div>
          <DashboardLogout />
        </header>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </SidebarProvider>
  );
}
