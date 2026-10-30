import { getSellerEarnings, getSellerOverview } from "../dashboard-data";

export default async function SellerEarningsPage() {
  const [history, overview] = await Promise.all([getSellerEarnings(), getSellerOverview()]);
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Finance</p>
      <h1 className="mt-2 font-display text-2xl font-semibold text-foreground sm:text-3xl">Earnings and payouts</h1>
      <p className="mt-2 text-sm text-muted-foreground">Ledger balances and completed sales history for your seller account.</p>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {overview.metrics.balances.length ? overview.metrics.balances.map((balance) => (
          <article key={balance.currency} className="rounded-2xl border border-white/[0.09] bg-card p-5">
            <p className="text-xs text-cyan-200">{balance.currency}</p>
            <p className="mt-3 text-xs text-slate-400">Available balance<span className="mt-1 block text-2xl font-semibold text-white">{balance.available}</span></p>
            <p className="mt-3 text-xs text-slate-400">Pending payout<span className="mt-1 block text-lg font-semibold text-white">{balance.pendingPayout}</span></p>
            <p className="mt-3 text-xs text-slate-400">Pending order balance<span className="mt-1 block text-lg font-semibold text-white">{balance.pendingBalance}</span></p>
          </article>
        )) : (
          <p className="rounded-2xl border border-dashed border-white/15 p-5 text-sm text-slate-400">No ledger balance is available yet.</p>
        )}
      </section>

      <section className="mt-8 grid min-w-0 gap-6 xl:grid-cols-2">
        <div id="withdrawals" className="scroll-mt-20 min-w-0">
          <h2 className="font-semibold text-white">Completed sales</h2>
          {history.sales.length ? (
            <ul className="mt-3 divide-y divide-white/[0.07] rounded-2xl border border-white/[0.09] bg-card px-4">
              {history.sales.map((sale) => (
                <li key={sale.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                  <span><span className="block text-slate-200">{sale.listingTitle}</span><span className="text-xs text-slate-500">Order {sale.order.orderNumber} · {sale.updatedAt.toLocaleDateString()}</span></span>
                  <span className="text-slate-200">{sale.currency} {sale.totalPrice}</span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-3 rounded-xl border border-dashed border-white/15 p-5 text-sm text-slate-400">Completed sales will be listed here.</p>}
        </div>
        <div>
          <h2 className="font-semibold text-white">Payout history</h2>
          {history.withdrawals.length ? (
            <ul className="mt-3 divide-y divide-white/[0.07] rounded-2xl border border-white/[0.09] bg-card px-4">
              {history.withdrawals.map((withdrawal) => (
                <li key={withdrawal.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                  <span><span className="block text-slate-200">{withdrawal.status.toLowerCase()}</span><span className="text-xs text-slate-500">{withdrawal.requestedAt.toLocaleDateString()}</span></span>
                  <span className="text-slate-200">{withdrawal.currency} {withdrawal.amount}</span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-3 rounded-xl border border-dashed border-white/15 p-5 text-sm text-slate-400">No payout requests have been recorded.</p>}
          <p className="mt-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-4 text-xs leading-5 text-amber-100/80">
            Payout method setup and withdrawal requests are not available in this marketplace yet. No bank or payment credentials are collected here.
          </p>
        </div>
      </section>
      <section id="transactions" className="mt-8 scroll-mt-20">
        <h2 className="font-semibold text-white">Ledger history</h2>
        {history.ledger.length ? (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-white/[0.09] bg-card">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="border-b border-white/[0.07] text-slate-500"><tr><th className="p-4">Date</th><th className="p-4">Type</th><th className="p-4">Source</th><th className="p-4">Description</th><th className="p-4 text-right">Amount</th></tr></thead>
              <tbody className="divide-y divide-white/[0.05]">
                {history.ledger.map((entry) => (
                  <tr key={entry.id} className="text-slate-300"><td className="p-4">{entry.createdAt.toLocaleDateString()}</td><td className="p-4">{entry.type.toLowerCase()}</td><td className="p-4">{entry.sourceType.toLowerCase()}</td><td className="p-4">{entry.description || "—"}</td><td className="p-4 text-right">{entry.currency} {entry.amount}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="mt-3 rounded-xl border border-dashed border-white/15 p-5 text-sm text-slate-400">Ledger entries will appear when marketplace transactions are settled.</p>}
      </section>
    </main>
  );
}
