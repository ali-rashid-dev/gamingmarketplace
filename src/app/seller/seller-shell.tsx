"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BadgeDollarSign,
  ClipboardList,
  FilePlus2,
  LayoutDashboard,
  MessageSquareText,
  PackageSearch,
  Settings,
  ShieldCheck,
  Star,
  Store,
  Wallet,
} from "lucide-react";
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
} from "@/components/ui/sidebar";
import { cn } from "cn";
import { useSidebar } from "@/components/ui/sidebar";

const navigation = [
  { label: "Overview", href: "/seller", icon: LayoutDashboard },
  { label: "My listings", href: "/seller/listings", icon: PackageSearch },
  { label: "Create listing", href: "/seller/listings/new", icon: FilePlus2 },
  { label: "Orders", href: "/seller/orders", icon: ClipboardList },
  { label: "Messages", href: "/seller/messages", icon: MessageSquareText },
  { label: "Reviews", href: "/seller/reviews", icon: Star },
  { label: "Earnings & transactions", href: "/seller/earnings#transactions", icon: BadgeDollarSign },
  { label: "Withdrawals", href: "/seller/earnings#withdrawals", icon: Wallet },
  { label: "My shop", href: "/seller/profile", icon: Store },
  { label: "Verification", href: "/seller/verification", icon: ShieldCheck },
  { label: "Settings", href: "/seller/settings", icon: Settings },
] as const;

function SellerNavigation() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash);
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, [pathname]);

  return (
    <Sidebar className="border-sidebar-border bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link href="/seller" className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Store className="size-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-sm font-semibold">Seller Studio</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">Manage your marketplace</span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map(({ label, href, icon: Icon }) => {
                const active = href === "/seller"
                  ? pathname === href
                  : pathname === href.split("#")[0] &&
                    (href === "/seller/earnings#withdrawals"
                      ? hash === "#withdrawals"
                      : href !== "/seller/earnings#transactions" ||
                        hash !== "#withdrawals");
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      render={<Link href={href} onClick={() => setOpenMobile(false)} />}
                      isActive={active}
                      tooltip={label}
                      className={cn(
                        "h-10",
                        active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      )}
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
          Keep your listings and fulfillment details up to date to help buyers shop with confidence.
        </p>
        <Button
          render={<Link href="/seller/listings/new" />}
          nativeButton={false}
          className="w-full"
        >
          <FilePlus2 aria-hidden="true" />
          Create listing
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

export function SellerShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider className="min-h-svh bg-background">
      <SellerNavigation />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex min-h-14 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="md:hidden" />
            <p className="truncate text-sm font-medium text-muted-foreground">Seller dashboard</p>
          </div>
          <Button
            render={<Link href="/seller/listings/new" />}
            nativeButton={false}
            variant="outline"
            size="sm"
            className="shrink-0"
          >
            <FilePlus2 aria-hidden="true" />
            <span className="hidden sm:inline">Create listing</span>
            <span className="sm:hidden">Create</span>
          </Button>
        </header>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </SidebarProvider>
  );
}
