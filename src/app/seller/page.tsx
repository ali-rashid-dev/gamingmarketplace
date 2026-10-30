import Link from "next/link";
import { getSellerOverview } from "./dashboard-data";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <Card className="h-full min-w-0">
      <CardHeader className="gap-1">
        <CardDescription>{label}</CardDescription>
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      </CardHeader>
      <CardContent>
        <p className="break-words font-display text-2xl font-semibold tabular-nums text-foreground sm:text-3xl">{value}</p>
      </CardContent>
    </Card>
  );
}

export default async function SellerDashboardPage() {
  const { profile, metrics, latestOrders } = await getSellerOverview();
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Seller overview</p>
          <h1 className="mt-2 break-words font-display text-2xl font-semibold text-foreground sm:text-3xl">Welcome, {profile.shopName}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your shop is {profile.isAvailable ? "available to buyers" : "currently unavailable to buyers"}.
          </p>
        </div>
        <Button
          render={<Link href="/seller/listings/new" />}
          nativeButton={false}
          className="w-full sm:w-auto"
        >
          Create listing
        </Button>
      </div>

      <section aria-label="Shop performance" className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Total orders" value={metrics.totalOrders} />
        <Metric
          label="Sales revenue"
          value={metrics.salesByCurrency.length
            ? metrics.salesByCurrency.map((item) => `${item.currency} ${item.amount}`).join(" · ")
            : "—"}
          detail="Completed seller order items"
        />
        <Metric label="Active listings" value={metrics.activeListings} />
        <Metric label="Average rating" value={metrics.averageRating?.toFixed(1) ?? "—"} detail={`${metrics.reviewCount} reviews`} />
        <Metric label="Pending deliveries" value={metrics.pendingDeliveries} />
        <Metric label="Disputed orders" value={metrics.disputedOrders} />
        <Metric
          label="Conversion rate"
          value="Not available"
          detail="No reliable listing-view tracking is configured"
        />
        <Metric label="Seller verification" value={profile.verifiedAt ? "Verified" : "Not verified"} />
      </section>

      <section className="mt-7 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div className="min-w-0">
              <CardTitle>Recent sales</CardTitle>
              <CardDescription className="mt-1">Latest orders for your shop</CardDescription>
            </div>
            <Button
              render={<Link href="/seller/orders" />}
              nativeButton={false}
              variant="ghost"
              size="sm"
              className="shrink-0"
            >
              View orders
            </Button>
          </CardHeader>
          <CardContent>
          {latestOrders.length ? (
            <ul className="divide-y divide-border">
              {latestOrders.map((order) => (
                <li key={order.id} className="flex min-w-0 flex-col justify-between gap-2 py-3 text-sm sm:flex-row sm:items-center">
                  <span className="min-w-0">
                    <span className="block break-words font-medium text-foreground">{order.listingTitle}</span>
                    <span className="mt-1 block break-words text-xs text-muted-foreground">Order {order.order.orderNumber} · {order.status.toLowerCase()}</span>
                  </span>
                  <span className="shrink-0 font-medium text-foreground">{order.currency} {order.totalPrice}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">Completed sales will appear here.</p>
          )}
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Balances</CardTitle>
            <CardDescription>Based on posted ledger entries and open payouts</CardDescription>
          </CardHeader>
          <CardContent>
          {metrics.balances.length ? (
            <div className="space-y-3">
              {metrics.balances.map((balance) => (
                <div key={balance.currency} className="rounded-lg border border-border p-4">
                  <p className="text-xs font-semibold text-primary">{balance.currency}</p>
                  <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                    <p className="text-muted-foreground">Available<span className="mt-1 block break-words text-sm font-semibold text-foreground">{balance.available}</span></p>
                    <p className="text-muted-foreground">Pending orders<span className="mt-1 block break-words text-sm font-semibold text-foreground">{balance.pendingBalance}</span></p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Balances are available after ledger entries are posted.</p>
          )}
            <Button
              render={<Link href="/seller/earnings" />}
              nativeButton={false}
              variant="link"
              className="mt-3 h-auto px-0"
            >
              Earnings and payout history
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
