import Link from "next/link";
import {
  ArrowUpRight,
  CircleDollarSign,
  ClipboardCheck,
  Gamepad2,
  Gavel,
  Headset,
  Store,
  Users,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminDashboard } from "./dashboard-data";

function Metric({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof Users;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <CardDescription>{label}</CardDescription>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <p className="break-words font-display text-2xl font-semibold tabular-nums sm:text-3xl">{value}</p>
      </CardContent>
    </Card>
  );
}

const queues = [
  { href: "/admin/sellers", label: "Seller applications", icon: Store, metric: "pendingSellers" },
  { href: "/admin/listings", label: "Listing reviews", icon: ClipboardCheck, metric: "pendingListings" },
  { href: "/support/console/disputes", label: "Disputes", icon: Gavel, metric: "pendingDisputes" },
  { href: "/support/console/tickets", label: "Support tickets", icon: Headset, metric: "openTickets" },
] as const;

export default async function AdminDashboardPage() {
  const { metrics, recentListings, recentDisputes } = await getAdminDashboard();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Admin overview</p>
        <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Marketplace operations</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Review marketplace activity and focus on the work that needs attention.
        </p>
      </div>

      <section aria-label="Marketplace analytics" className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total users" value={metrics.totalUsers} detail="Buyer and seller accounts" icon={Users} />
        <Metric label="Total orders" value={metrics.totalOrders} detail="Marketplace transactions" icon={Gamepad2} />
        <Metric
          label="Platform revenue"
          value={metrics.platformRevenue.length ? metrics.platformRevenue.join(" · ") : "—"}
          detail="Fees from paid, processing, and completed orders"
          icon={CircleDollarSign}
        />
        <Metric label="Pending cases" value={metrics.pendingDisputes} detail="Open or under-review disputes" icon={Gavel} />
      </section>

      <section aria-label="Operational queues" className="mt-6">
        <h2 className="mb-3 font-display text-lg font-semibold">Needs attention</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {queues.map(({ href, label, icon: Icon, metric }) => {
            const count = metrics[metric];
            return (
              <Link
                key={label}
                href={href}
                className="group rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="size-4 text-primary" aria-hidden="true" />
                    {label}
                  </span>
                  <ArrowUpRight className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" aria-hidden="true" />
                </span>
                <span className="mt-3 block font-display text-2xl font-semibold tabular-nums">{count}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-6 grid min-w-0 gap-4 xl:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Listings awaiting review</CardTitle>
              <CardDescription className="mt-1">Oldest submissions are shown first.</CardDescription>
            </div>
            <Link href="/admin/listings" className="shrink-0 text-sm text-primary hover:underline">
              View queue
            </Link>
          </CardHeader>
          <CardContent>
            {recentListings.length ? (
              <ul className="divide-y divide-border">
                {recentListings.map((listing) => (
                  <li key={listing.id} className="flex min-w-0 items-center justify-between gap-3 py-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{listing.title}</span>
                      <span className="mt-1 block truncate text-xs text-muted-foreground">
                        {listing.game.name} · {listing.seller.shopName}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {listing.createdAt.toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
                No listings are waiting for review.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Open disputes</CardTitle>
              <CardDescription className="mt-1">Cases awaiting investigation or resolution.</CardDescription>
            </div>
            <Link href="/support/console/disputes" className="shrink-0 text-sm text-primary hover:underline">
              View cases
            </Link>
          </CardHeader>
          <CardContent>
            {recentDisputes.length ? (
              <ul className="divide-y divide-border">
                {recentDisputes.map((dispute) => (
                  <li key={dispute.id} className="py-3">
                    <Link href={`/support/console/disputes/${dispute.id}`} className="block min-w-0 hover:underline">
                      <span className="block truncate text-sm font-medium">{dispute.reason}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        Order {dispute.order.orderNumber} · {dispute.openedBy.name} · {dispute.status.replaceAll("_", " ")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
                No disputes need attention.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="mt-4 border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3 py-4">
          <Gamepad2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-xs leading-5 text-muted-foreground">
            This workspace is for day-to-day marketplace operations. It does not provide controls for administrator privileges or system-wide security.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
