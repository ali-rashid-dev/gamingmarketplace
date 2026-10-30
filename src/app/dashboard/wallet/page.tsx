import Link from "next/link";
import { requirePageSession } from "@/lib/authorization";
import { getBuyerPayments } from "../buyer-data";

function money(amount: string, currency: string) {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).format(Number(amount));
  } catch {
    return `${currency} ${amount}`;
  }
}

export default async function BuyerPaymentsPage() {
  const { user } = await requirePageSession();
  const payments = await getBuyerPayments(user.id);
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-patina">Transactions</p>
      <h1 className="mt-2 font-display text-3xl font-semibold">Payment history</h1>
      <p className="mt-2 text-sm text-muted-foreground">Payment records for your orders. This is not a stored wallet balance.</p>
      {payments.length ? (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr><th className="p-4 font-medium">Order</th><th className="p-4 font-medium">Date</th><th className="p-4 font-medium">Status</th><th className="p-4 text-right font-medium">Amount</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="p-4"><Link href={`/dashboard/orders/${payment.order.id}`} className="font-medium text-gold hover:underline">{payment.order.orderNumber}</Link></td>
                  <td className="p-4 text-muted-foreground">{(payment.paidAt ?? payment.createdAt).toLocaleDateString()}</td>
                  <td className="p-4 capitalize text-muted-foreground">{payment.status.toLowerCase().replaceAll("_", " ")}</td>
                  <td className="p-4 text-right font-medium">{money(payment.amount, payment.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-6 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Payment records will appear here after checkout is available.</p>
      )}
    </div>
  );
}
