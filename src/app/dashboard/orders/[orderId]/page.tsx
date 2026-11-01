import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageSession } from "@/lib/authorization";
import { getBuyerOrder } from "../../buyer-data";
import { ConfirmReceiptButton } from "../order-item-actions";
import { PrintReceiptButton } from "../print-receipt-button";
import { OrderMessageButton } from "../order-message-button";

type Props = { params: Promise<{ orderId: string }> };

function money(amount: string, currency: string) {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).format(Number(amount));
  } catch {
    return `${currency} ${amount}`;
  }
}

export default async function BuyerOrderDetailPage({ params }: Props) {
  const [{ user }, { orderId }] = await Promise.all([requirePageSession(), params]);
  const order = await getBuyerOrder(user.id, orderId);
  if (!order) notFound();

  return (
    <div>
      <Link href="/dashboard/orders" className="text-sm text-muted-foreground hover:text-gold">← All orders</Link>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-patina">Order details</p>
      <h1 className="mt-2 break-all font-display text-3xl font-semibold">{order.orderNumber}</h1>
      <p className="mt-2 text-sm capitalize text-muted-foreground">
        {order.status.toLowerCase().replaceAll("_", " ")} · Placed {order.placedAt.toLocaleString()}
      </p>
      {["PAID", "PROCESSING", "COMPLETED", "DISPUTED", "REFUNDED"].includes(order.status) && (
        <div className="mt-4">
          <PrintReceiptButton />
          <p className="mt-2 text-xs text-muted-foreground">
            Order receipt only; it is not a tax invoice.
          </p>
        </div>
      )}

      <section className="mt-6 rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="font-display text-xl font-semibold">Items and delivery</h2>
        <div className="mt-4 space-y-4">
          {order.items.map((item) => (
            <article key={item.id} className="rounded-lg border border-border p-3 sm:p-4">
              <div className="flex flex-wrap justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="break-words font-semibold">{item.listingTitle}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sold by {item.seller.shopName} · Qty {item.quantity} · {item.status.toLowerCase()}
                  </p>
                  <OrderMessageButton orderId={order.id} sellerUserId={item.seller.user.id} />
                </div>
                <p className="text-sm font-semibold">{money(item.totalPrice, item.currency)}</p>
              </div>
              {item.deliveries.map((delivery) => (
                <div key={delivery.id} className="mt-4 rounded-lg bg-secondary/60 p-3 sm:p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gold">Delivery · {delivery.status.toLowerCase().replaceAll("_", " ")}</p>
                  {delivery.deliveredAt && <p className="mt-1 text-xs text-muted-foreground">Delivered {delivery.deliveredAt.toLocaleString()}</p>}
                  {delivery.instructions && <p className="mt-3 whitespace-pre-wrap text-sm">{delivery.instructions}</p>}
                  {delivery.details && (
                    <pre className="mt-3 max-w-full overflow-x-auto whitespace-pre-wrap break-all text-xs text-muted-foreground">
                      {typeof delivery.details === "string" ? delivery.details : JSON.stringify(delivery.details, null, 2)}
                    </pre>
                  )}
                  {delivery.status === "DELIVERED" && item.status === "DELIVERED" && !item.disputes.length && (
                    <div className="mt-4">
                      <ConfirmReceiptButton orderItemId={item.id} />
                    </div>
                  )}
                </div>
              ))}
              {item.disputes.map((dispute) => (
                <p key={dispute.id} className="mt-3 break-words rounded-lg border border-gold/20 bg-gold/5 p-3 text-xs">
                  Support case {dispute.status.toLowerCase().replaceAll("_", " ")} · {dispute.reason}
                </p>
              ))}
              {!item.deliveries.length && <p className="mt-4 text-xs text-muted-foreground">Delivery details will appear here when the seller fulfills this order.</p>}
              <Link
                href={`/dashboard/support?orderId=${order.id}`}
                className="mt-4 inline-flex text-xs font-semibold text-gold hover:underline"
              >
                Get help with this item
              </Link>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <section className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="font-display text-xl font-semibold">Payment</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Subtotal</dt><dd className="break-all">{money(order.subtotal, order.currency)}</dd></div>
            <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Fees</dt><dd className="break-all">{money(order.fees, order.currency)}</dd></div>
            <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-2 font-semibold"><dt>Total</dt><dd className="break-all">{money(order.total, order.currency)}</dd></div>
          </dl>
          <div className="mt-4 space-y-2 border-t border-border pt-3">
            {order.payments.length ? order.payments.map((payment) => (
              <p key={payment.id} className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                <span className="break-words">{payment.status.toLowerCase().replaceAll("_", " ")}{payment.paidAt ? ` · ${payment.paidAt.toLocaleDateString()}` : ""}</span>
                <span className="break-all">{money(payment.amount, payment.currency)}</span>
              </p>
            )) : <p className="text-xs text-muted-foreground">No payment record is available for this order.</p>}
          </div>
        </section>
        <section className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="font-display text-xl font-semibold">Need help?</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            If delivery is missing or there is a problem with your order, open a support ticket. Support can review the order record and advise on next steps.
          </p>
          <Link href={`/dashboard/support?orderId=${order.id}`} className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground">
            Contact support
          </Link>
        </section>
      </div>
    </div>
  );
}
