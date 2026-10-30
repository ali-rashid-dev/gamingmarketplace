import Link from "next/link";
import {
  Bell,
  CircleHelp,
  CreditCard,
  Heart,
  LayoutDashboard,
  MessageCircle,
  Package,
  Shield,
  Star,
  UserRound,
} from "lucide-react";
import { requirePageSession } from "@/lib/authorization";
import { DashboardLogout } from "./dashboard-logout";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/orders", label: "My orders", icon: Package },
  { href: "/dashboard/messages", label: "Messages", icon: MessageCircle },
  { href: "/dashboard/reviews", label: "Reviews", icon: Star },
  { href: "/dashboard/wishlist", label: "Wishlist", icon: Heart },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/wallet", label: "Payments", icon: CreditCard },
  { href: "/dashboard/profile", label: "Profile", icon: UserRound },
  { href: "/dashboard/security", label: "Security", icon: Shield },
  { href: "/dashboard/support", label: "Support", icon: CircleHelp },
];

export default async function BuyerDashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user } = await requirePageSession();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div>
            <Link href="/dashboard" className="font-display text-lg font-semibold">
              GameTrade <span className="text-gold">Account</span>
            </Link>
            <p className="mt-0.5 text-xs text-muted-foreground">{user.name}</p>
          </div>
          <div className="flex items-center gap-2">
            {user.role === "SELLER" && (
              <Link
                href="/seller"
                className="hidden rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground sm:inline-flex"
              >
                Seller studio
              </Link>
            )}
            {["SUPPORT", "ADMIN", "SUPER_ADMIN"].includes(user.role ?? "") && (
              <Link
                href="/support/console"
                className="hidden rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground sm:inline-flex"
              >
                Support console
              </Link>
            )}
            <Link
              href="/"
              className="hidden rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground sm:inline-flex"
            >
              Browse marketplace
            </Link>
            <DashboardLogout />
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-7 px-5 py-7 sm:px-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:py-10">
        <aside>
          <nav
            aria-label="Account navigation"
            className="flex gap-2 overflow-x-auto pb-2 lg:sticky lg:top-6 lg:grid lg:gap-1 lg:overflow-visible lg:pb-0"
          >
            {navigation.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition hover:border-gold/40 hover:bg-card hover:text-foreground lg:border-transparent lg:px-3 lg:text-sm"
              >
                <Icon aria-hidden="true" className="h-4 w-4 text-gold" />
                {label}
              </Link>
            ))}
          </nav>
          <p className="mt-8 hidden rounded-xl border border-border bg-card p-4 text-xs leading-5 text-muted-foreground lg:block">
            Keep order communication and support requests on GameTrade. Never share passwords or recovery codes.
          </p>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
