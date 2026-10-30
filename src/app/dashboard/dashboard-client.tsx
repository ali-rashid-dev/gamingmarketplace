import Link from "next/link";
import { ArrowRight, Bell, CircleHelp, Heart, MessageCircle, Package, Star } from "lucide-react";
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

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-patina">Buyer dashboard</p>
        <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Welcome back, {name || "there"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your purchases, conversations, and account settings in one place.
        </p>
      </section>

      <section aria-label="Order summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="rounded-xl border border-border bg-card p-5 transition hover:border-gold/40"
          >
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              {label}
              <Icon aria-hidden="true" className="h-4 w-4 text-gold" />
            </div>
            <p className="mt-3 font-display text-3xl font-semibold">{value}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold">Recent purchases</h2>
              <p className="mt-1 text-xs text-muted-foreground">Track your latest order activity.</p>
            </div>
            <Link href="/dashboard/orders" className="text-xs font-semibold text-gold hover:text-gold/80">
              All orders <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
            </Link>
          </div>
          {overview.recentOrders.length ? (
            <div className="mt-4 divide-y divide-border">
              {overview.recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/dashboard/orders/${order.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-1 last:pb-1"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{order.items[0]?.listingTitle ?? "Order"}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {order.orderNumber} · {order.placedAt.toLocaleDateString()}
                      {order._count.items > 1 ? ` · +${order._count.items - 1} items` : ""}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-sm font-semibold">{currency(order.total, order.currency)}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{order.status.toLowerCase().replaceAll("_", " ")}</span>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">Your purchases will appear here.</p>
              <Link href="/offers" className="mt-3 inline-flex text-sm font-semibold text-gold hover:text-gold/80">
                Explore offers <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-display text-xl font-semibold">Spending summary</h2>
            <p className="mt-1 text-xs text-muted-foreground">Successful payments on your orders.</p>
            {overview.spending.length ? (
              <div className="mt-4 space-y-3">
                {overview.spending.map((item) => (
                  <div key={item.currency} className="flex justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{item.currency} paid</span>
                    <span className="font-semibold">{currency(item.amount, item.currency)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">No successful payments yet.</p>
            )}
            <Link href="/dashboard/wallet" className="mt-4 inline-flex text-xs font-semibold text-gold hover:text-gold/80">
              View payment history <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </section>
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl font-semibold">Your activity</h2>
              <Heart aria-hidden="true" className="h-4 w-4 text-gold" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Link href="/dashboard/messages" className="rounded-lg border border-border p-3 hover:border-gold/40">
                <MessageCircle className="h-4 w-4 text-gold" />
                <span className="mt-2 block text-sm font-semibold">{overview.metrics.unreadMessages} unread</span>
                <span className="text-xs text-muted-foreground">Messages</span>
              </Link>
              <Link href="/dashboard/wishlist" className="rounded-lg border border-border p-3 hover:border-gold/40">
                <Heart className="h-4 w-4 text-gold" />
                <span className="mt-2 block text-sm font-semibold">{overview.metrics.wishlistCount} saved</span>
                <span className="text-xs text-muted-foreground">Wishlist</span>
              </Link>
              <Link href="/dashboard/reviews" className="rounded-lg border border-border p-3 hover:border-gold/40">
                <Star className="h-4 w-4 text-gold" />
                <span className="mt-2 block text-sm font-semibold">{overview.metrics.pendingReviews} eligible</span>
                <span className="text-xs text-muted-foreground">Reviews</span>
              </Link>
              <Link href="/dashboard/notifications" className="rounded-lg border border-border p-3 hover:border-gold/40">
                <Bell className="h-4 w-4 text-gold" />
                <span className="mt-2 block text-sm font-semibold">Updates</span>
                <span className="text-xs text-muted-foreground">Notifications</span>
              </Link>
            </div>
          </section>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold">Recent messages</h2>
            <p className="mt-1 text-xs text-muted-foreground">Conversations with your sellers.</p>
          </div>
          <Link href="/dashboard/messages" className="text-xs font-semibold text-gold hover:text-gold/80">
            Open inbox <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
          </Link>
        </div>
        {overview.recentConversations.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {overview.recentConversations.map((conversation) => (
              <Link key={conversation.id} href="/dashboard/messages" className="rounded-lg border border-border p-4 transition hover:border-gold/40">
                <p className="text-sm font-semibold">{conversation.seller.name}</p>
                <p className="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-muted-foreground">
                  {conversation.messages[0]?.body ?? "No messages yet"}
                </p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {conversation.order?.orderNumber ?? "Seller conversation"}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">Your seller conversations will appear here.</p>
        )}
      </section>
    </div>
  );
}
