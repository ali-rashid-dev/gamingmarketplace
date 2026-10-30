import { getSupportDisputes, searchSupportOrders } from "../data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Props = { searchParams: Promise<{ q?: string }> };

export default async function SupportOrdersPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const [orders, disputes] = await Promise.all([
    searchSupportOrders(q),
    q.trim() ? Promise.resolve([]) : getSupportDisputes("ACTIVE"),
  ]);
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Read-only investigation</p>
      <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Order lookup</h1>
      <p className="mt-2 text-sm text-muted-foreground">Search by order number or buyer/seller name and email. Payment records are not shown.</p>
      <form className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Input name="q" defaultValue={q} placeholder="Order number, customer or seller" className="min-w-0 flex-1" />
        <button className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Search orders</button>
      </form>
      {q.trim() ? (
        orders.length ? (
          <div className="mt-5 space-y-3">
            {orders.map((order) => (
              <Card key={order.id} className="min-w-0">
                <CardHeader>
                  <CardTitle className="break-words text-base">{order.orderNumber} · {order.status.replaceAll("_", " ")}</CardTitle>
                  <p className="text-xs text-muted-foreground">Placed {order.placedAt.toLocaleString()} · Buyer {order.buyer.name} ({order.buyer.email})</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm font-medium">Order total {order.currency} {order.total.toString()}</p>
                  {order.items.map((item) => (
                    <div key={item.id} className="rounded-lg border border-border p-3">
                      <p className="break-words text-sm font-medium">{item.listingTitle}</p>
                      <p className="mt-1 break-words text-xs text-muted-foreground">
                        Seller {item.seller.user.name} · {item.seller.user.email} · {item.status.toLowerCase()}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.currency} {item.totalPrice.toString()}</p>
                      {item.deliveries.map((delivery, index) => (
                        <p key={`${item.id}-${index}`} className="mt-1 text-xs text-muted-foreground">
                          Delivery {delivery.status.toLowerCase()}{delivery.deliveredAt ? ` · ${delivery.deliveredAt.toLocaleString()}` : ""}
                        </p>
                      ))}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : <p className="mt-5 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">No matching orders found.</p>
      ) : (
        <Card className="mt-5">
          <CardHeader><CardTitle className="text-base">Orders with open disputes</CardTitle></CardHeader>
          <CardContent>
            {disputes.length ? (
              <ul className="divide-y divide-border">
                {disputes.map((dispute) => (
                  <li key={dispute.id} className="py-3">
                    <a href={`/support/console/disputes/${dispute.id}`} className="font-medium text-sm hover:underline">
                      {dispute.order.orderNumber} · {dispute.reason}
                    </a>
                    <p className="mt-1 text-xs text-muted-foreground">{dispute.order.buyer.name} · {dispute.status.replaceAll("_", " ")}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">No open disputes require attention.</p>}
          </CardContent>
        </Card>
      )}
      <p className="mt-4 text-xs text-muted-foreground">Investigation is read-only. Payment records, refunds, and fund controls are restricted.</p>
    </main>
  );
}
