import Link from "next/link";
import { getSellerOverview } from "./dashboard-data";

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
    <article className="rounded-2xl border border-white/[0.09] bg-card p-5">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-white">{value}</p>
      {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
    </article>
  );
}

export default async function SellerDashboardPage() {
  const { profile, metrics, latestOrders } = await getSellerOverview();
  return (
    <main className="mx-auto max-w-7xl px-5 py-9 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Seller overview</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-white">Welcome, {profile.shopName}</h1>
          <p className="mt-2 text-sm text-slate-400">
            Your shop is {profile.isAvailable ? "available to buyers" : "currently unavailable to buyers"}.
          </p>
        </div>
        <Link href="/seller/listings/new" className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-200">Create listing</Link>
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

      <section className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-white/[0.09] bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-white">Recent sales</h2>
            <Link href="/seller/orders" className="text-xs font-semibold text-cyan-200 hover:text-white">View orders</Link>
          </div>
          {latestOrders.length ? (
            <ul className="mt-4 divide-y divide-white/[0.06]">
              {latestOrders.map((order) => (
                <li key={order.id} className="flex flex-wrap justify-between gap-3 py-3 text-sm">
                  <span>
                    <span className="block font-medium text-slate-200">{order.listingTitle}</span>
                    <span className="mt-1 block text-xs text-slate-500">Order {order.order.orderNumber} · {order.status.toLowerCase()}</span>
                  </span>
                  <span className="text-slate-200">{order.currency} {order.totalPrice}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-white/10 p-5 text-sm text-slate-400">Completed sales will appear here.</p>
          )}
        </div>
        <div className="rounded-2xl border border-white/[0.09] bg-card p-5">
          <h2 className="font-semibold text-white">Balances</h2>
          {metrics.balances.length ? (
            <div className="mt-4 space-y-3">
              {metrics.balances.map((balance) => (
                <div key={balance.currency} className="rounded-xl border border-white/[0.06] p-4">
                  <p className="text-xs font-semibold text-cyan-100">{balance.currency}</p>
                  <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                    <p className="text-slate-400">Available<span className="mt-1 block text-sm font-semibold text-white">{balance.available}</span></p>
                    <p className="text-slate-400">Pending balance<span className="mt-1 block text-sm font-semibold text-white">{balance.pendingBalance}</span></p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">Balances are available after ledger entries are posted.</p>
          )}
          <Link href="/seller/earnings" className="mt-4 inline-block text-xs font-semibold text-cyan-200 hover:text-white">Earnings and payout history</Link>
        </div>
      </section>
    </main>
  );
}
