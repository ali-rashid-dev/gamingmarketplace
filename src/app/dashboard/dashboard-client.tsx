import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  CircleHelp,
  Heart,
  MessageCircle,
  Package,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { getBuyerOverview } from "./buyer-data";

type Overview = Awaited<ReturnType<typeof getBuyerOverview>>;

function currency(amount: string, code: string) {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(Number(amount));
  } catch {
    return `${code} ${amount}`;
  }
}

export default function DashboardClient({
  name,
  overview,
}: {
  name: string;
  overview: Overview;
}) {
  const stats = [
    { label: "Total orders", value: overview.metrics.totalOrders, icon: Package, href: "/dashboard/orders" },
    { label: "Active orders", value: overview.metrics.activeOrders, icon: ArrowRight, href: "/dashboard/orders?status=PROCESSING" },
    { label: "Completed", value: overview.metrics.completedOrders, icon: Star, href: "/dashboard/orders?status=COMPLETED" },
    { label: "Open disputes", value: overview.metrics.openDisputes, icon: CircleHelp, href: "/dashboard/orders?status=DISPUTED" },
  ];

  const activity = [
    { href: "/dashboard/messages", label: "Messages", detail: `${overview.metrics.unreadMessages} unread`, icon: MessageCircle },
    { href: "/dashboard/wishlist", label: "Wishlist", detail: `${overview.metrics.wishlistCount} saved`, icon: Heart },
    { href: "/dashboard/reviews", label: "Reviews", detail: `${overview.metrics.pendingReviews} eligible`, icon: Star },
    { href: "/dashboard/notifications", label: "Notifications", detail: "View updates", icon: Bell },
  ];

  return (
    <div className="min-w-0 space-y-6 sm:space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-patina">Buyer dashboard</p>
          <h1 className="mt-2 break-words font-display text-2xl font-semibold sm:text-4xl">
            Welcome back, {name || "there"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your purchases, conversations, and account settings in one place.
          </p>
        </div>
        <Button render={<Link href="/offers" />}>
          Explore marketplace
          <ArrowUpRight data-icon="inline-end" />
        </Button>
      </section>

      <section aria-label="Order summary" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="group min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Card className="h-full transition-colors group-hover:ring-primary/40">
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <CardDescription>{label}</CardDescription>
                <span className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
              </CardHeader>
              <CardContent>
                <p className="font-display text-2xl font-semibold tabular-nums sm:text-3xl">{value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Recent purchases</CardTitle>
              <CardDescription className="mt-1">Track your latest order activity.</CardDescription>
            </div>
            <Button render={<Link href="/dashboard/orders" />} variant="ghost" size="sm">
              All orders
              <ArrowRight data-icon="inline-end" />
            </Button>
          </CardHeader>
          <CardContent>
            {overview.recentOrders.length ? (
              <ul className="divide-y divide-border">
                {overview.recentOrders.map((order) => (
                  <li key={order.id}>
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-1 last:pb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block break-words text-sm font-medium sm:truncate">
                          {order.items[0]?.listingTitle ?? "Order"}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          <span className="break-all">{order.orderNumber}</span> · {order.placedAt.toLocaleDateString()}
                          {order._count.items > 1 ? ` · +${order._count.items - 1} items` : ""}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-sm font-semibold">{currency(order.total, order.currency)}</span>
                        <Badge variant={order.status === "COMPLETED" ? "secondary" : "outline"}>
                          {order.status.toLowerCase().replaceAll("_", " ")}
                        </Badge>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
                <Package aria-hidden="true" className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">No purchases yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Your orders will show up here.</p>
                <Button render={<Link href="/offers" />} variant="outline" className="mt-4">
                  Explore offers
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Spending summary</CardTitle>
              <CardDescription>Successful payments on your orders.</CardDescription>
            </CardHeader>
            <CardContent>
              {overview.spending.length ? (
                <div className="space-y-3">
                  {overview.spending.map((item) => (
                    <div key={item.currency} className="flex flex-wrap justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">{item.currency} paid</span>
                      <span className="break-all font-semibold tabular-nums">{currency(item.amount, item.currency)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No successful payments yet.</p>
              )}
              <Button render={<Link href="/dashboard/wallet" />} variant="link" className="mt-3 h-auto p-0">
                View payment history
                <ArrowRight data-icon="inline-end" />
              </Button>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Your activity</CardTitle>
              <CardDescription>Shortcuts to your account activity.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {activity.map(({ href, label, detail, icon: Icon }) => (
                <Link
                  key={label}
                  href={href}
                  className="group min-w-0 rounded-lg border border-border p-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Icon aria-hidden="true" className="size-4 text-primary" />
                  <span className="mt-2 block break-words text-sm font-semibold">{detail}</span>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <Card className="min-w-0">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Recent messages</CardTitle>
            <CardDescription className="mt-1">Conversations with your sellers.</CardDescription>
          </div>
          <Button render={<Link href="/dashboard/messages" />} variant="ghost" size="sm">
            Open inbox
            <ArrowRight data-icon="inline-end" />
          </Button>
        </CardHeader>
        <CardContent>
          {overview.recentConversations.length ? (
            <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {overview.recentConversations.map((conversation) => (
                <Link
                  key={conversation.id}
                  href="/dashboard/messages"
                  className="min-w-0 rounded-lg border border-border p-4 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <p className="break-words text-sm font-semibold">{conversation.seller.name}</p>
                  <p className="mt-1 line-clamp-2 min-h-10 break-words text-xs leading-5 text-muted-foreground">
                    {conversation.messages[0]?.body ?? "No messages yet"}
                  </p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {conversation.order?.orderNumber ?? "Seller conversation"}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
              Your seller conversations will appear here.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
