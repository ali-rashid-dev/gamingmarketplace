"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ClipboardCheck,
  ClipboardList,
  Gamepad2,
  Headset,
  KeyRound,
  LayoutDashboard,
  MessageSquareWarning,
  Shield,
  Store,
  Users,
  type LucideIcon,
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

const icons = {
  Activity,
  ClipboardCheck,
  ClipboardList,
  Gamepad2,
  Headset,
  KeyRound,
  LayoutDashboard,
  MessageSquareWarning,
  Shield,
  Store,
  Users,
} satisfies Record<string, LucideIcon>;

export type WorkspaceNavigationItem = {
  href: string;
  label: string;
  icon: keyof typeof icons;
};

function WorkspaceNavigation({
  homeHref,
  homeLabel,
  description,
  navigationLabel,
  navigation,
  footerTitle,
  footerDescription,
}: {
  homeHref: string;
  homeLabel: string;
  description: string;
  navigationLabel: string;
  navigation: readonly WorkspaceNavigationItem[];
  footerTitle: string;
  footerDescription: string;
}) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link href={homeHref} className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Activity className="size-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-sm font-semibold">{homeLabel}</span>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">{description}</span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <nav aria-label={navigationLabel}>
              <SidebarMenu>
                {navigation.map(({ href, label, icon }) => {
                  const Icon = icons[icon];
                  const active = pathname === href ||
                    (href !== homeHref && pathname.startsWith(`${href}/`));
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
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="px-2">
          <p className="text-xs font-medium text-foreground">{footerTitle}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{footerDescription}</p>
        </div>
        <Button
          render={<Link href="/dashboard" />}
          nativeButton={false}
          variant="outline"
          className="w-full"
        >
          My account
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

export function WorkspaceShell({
  children,
  homeHref,
  homeLabel,
  description,
  navigationLabel,
  navigation,
  footerTitle,
  footerDescription,
}: {
  children: React.ReactNode;
  homeHref: string;
  homeLabel: string;
  description: string;
  navigationLabel: string;
  navigation: readonly WorkspaceNavigationItem[];
  footerTitle: string;
  footerDescription: string;
}) {
  return (
    <SidebarProvider className="min-h-svh bg-background">
      <WorkspaceNavigation
        homeHref={homeHref}
        homeLabel={homeLabel}
        description={description}
        navigationLabel={navigationLabel}
        navigation={navigation}
        footerTitle={footerTitle}
        footerDescription={footerDescription}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex min-h-14 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="md:hidden" />
            <p className="truncate text-sm font-medium text-muted-foreground">{description}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              render={<Link href="/" />}
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
            >
              Browse marketplace
            </Button>
            <DashboardLogout />
          </div>
        </header>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </SidebarProvider>
  );
}
