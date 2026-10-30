import Link from "next/link";
import { getBuyerOrders, type BuyerOrderFilter } from "../buyer-data";
import { requirePageSession } from "@/lib/authorization";

const filters: { value: BuyerOrderFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "DISPUTED", label: "Disputed" },
];

type Props = {
  searchParams: Promise<{ status?: string; q?: string }>;
};

function money(amount: string, currency: string) {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).format(Number(amount));
  } catch {
    return `${currency} ${amount}`;
  }
}

export default async function BuyerOrdersPage({ searchParams }: Props) {
  const { user } = await requirePageSession();
  const params = await searchParams;
  const selected = filters.some((filter) => filter.value === params.status)
    ? (params.status as BuyerOrderFilter)
    : "ALL";
  const orders = await getBuyerOrders(user.id, selected, params.q ?? "");

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-patina">Purchases</p>
      <h1 className="mt-2 break-words font-display text-3xl font-semibold">My orders</h1>
      <p className="mt-2 text-sm text-muted-foreground">Review order status, delivery, and seller details.</p>

      <form className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          name="q"
          defaultValue={params.q}
          placeholder="Search order number or offer"
          className="min-h-10 flex-1 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-gold"
        />
        {selected !== "ALL" && <input type="hidden" name="status" value={selected} />}
        <button className="min-h-10 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground sm:shrink-0">Search orders</button>
      </form>

      <nav aria-label="Filter orders" className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {filters.map((filter) => {
          const query = new URLSearchParams({
              ...(filter.value === "ALL" ? {} : { status: filter.value }),
              ...(params.q ? { q: params.q } : {}),
          });
          return (
            <Link
              key={filter.value}
              href={query.size ? `/dashboard/orders?${query.toString()}` : "/dashboard/orders"}
              aria-current={selected === filter.value ? "page" : undefined}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
                selected === filter.value
                  ? "border-gold/50 bg-gold/10 text-gold"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      {orders.length ? (
        <div className="mt-4 space-y-3">
          {orders.map((order) => (
            <article key={order.id} className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">{order.orderNumber} · {order.placedAt.toLocaleDateString()}</p>
                  <h2 className="mt-1 break-words font-semibold">{order.items[0]?.listingTitle ?? "Order"}</h2>
                  {order.items.length > 1 && <p className="mt-1 text-xs text-muted-foreground">and {order.items.length - 1} more item(s)</p>}
                </div>
                <div className="text-right">
                  <p className="font-semibold">{money(order.total, order.currency)}</p>
                  <p className="mt-1 text-xs capitalize text-muted-foreground">{order.status.toLowerCase().replaceAll("_", " ")}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">
                  {order.items.map((item) => item.deliveries[0]?.status.toLowerCase().replaceAll("_", " ") ?? item.status.toLowerCase()).join(" · ")}
                </p>
                <Link href={`/dashboard/orders/${order.id}`} className="text-sm font-semibold text-gold hover:text-gold/80">
                  Order details
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground sm:p-8">
          No orders match this filter. <Link href="/offers" className="font-semibold text-gold hover:underline">Browse offers</Link>
        </p>
      )}
    </div>
  );
}
