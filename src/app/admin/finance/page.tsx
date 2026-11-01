import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WithdrawalStatus } from "@/generated/prisma/enums";
import { getFinanceDashboard } from "./data";
import {
  CommissionRuleForm,
  PostSettledEarningForm,
  WithdrawalStatusForm,
} from "./finance-forms";

const nextStatuses: Partial<Record<WithdrawalStatus, WithdrawalStatus[]>> = {
  [WithdrawalStatus.REQUESTED]: [WithdrawalStatus.APPROVED, WithdrawalStatus.REJECTED],
  [WithdrawalStatus.APPROVED]: [WithdrawalStatus.PROCESSING, WithdrawalStatus.REJECTED],
  [WithdrawalStatus.PROCESSING]: [WithdrawalStatus.PAID, WithdrawalStatus.FAILED],
};

export default async function AdminFinancePage() {
  const data = await getFinanceDashboard();
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Finance operations</p>
      <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Ledger and payouts</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
        Configure versioned commissions, reconcile provider-confirmed settlements, and track seller payout requests.
        No funds are transferred by these controls.
      </p>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Commission policy</CardTitle>
            <CardDescription>
              New rates apply immediately to future ledger postings. Existing commission records keep their original rate.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CommissionRuleForm />
            <ul className="mt-5 divide-y">
              {data.rules.map((rule) => (
                <li key={rule.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                  <span>{rule.rate}% · {rule.createdBy.name}</span>
                  <span className="text-muted-foreground">{rule.effectiveAt.toLocaleString()}</span>
                </li>
              ))}
              {data.rules.length === 0 && (
                <li className="py-3 text-sm text-muted-foreground">
                  No commission rate is configured. Seller earnings cannot be posted until an administrator sets one.
                </li>
              )}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reconciliation snapshot</CardTitle>
            <CardDescription>Amounts are aggregated by currency; currencies are never converted.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Provider-confirmed settled payments: <span className="font-semibold text-foreground">{data.settledPaymentCount}</span>
            </p>
            {data.commissionTotals.length ? (
              <div className="mt-3 space-y-3">
                {data.commissionTotals.map((total) => {
                  const balance = data.balances.find((entry) => entry.currency === total.currency);
                  return (
                    <div key={total.currency} className="rounded-lg border p-3 text-sm">
                      <p className="font-medium">{total.currency}</p>
                      <p className="mt-1 text-muted-foreground">
                        Gross {total.gross} · commission {total.commission} · seller net {total.sellerNet}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        Ledger sale credits {total.ledgerEarnings} · reconciliation delta {total.reconciliationDelta}
                      </p>
                      <p className="mt-1 text-muted-foreground">Ledger available: {balance?.available ?? "0.00"}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No seller commissions have been posted. Settlement data is written only by a future verified payment integration.
              </p>
            )}
            {data.payoutTotals.length > 0 && (
              <div className="mt-4 border-t pt-4">
                <h3 className="text-sm font-medium">Payout totals</h3>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {data.payoutTotals.map((payout) => (
                    <li key={`${payout.currency}-${payout.status}`}>
                      {payout.currency} · {payout.status.toLowerCase()} · {payout.count} · {payout.amount}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Settled sales to post</CardTitle>
          <CardDescription>
            Only completed, undisputed order items covered by confirmed provider settlement records are eligible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.unreconciledItems.length ? (
            <ul className="divide-y">
              {data.unreconciledItems.map((item) => (
                <li key={item.id} className="flex flex-wrap items-start justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="font-medium">{item.listingTitle}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.seller.shopName} · Order {item.order.orderNumber} · {item.currency} {item.totalPrice}
                    </p>
                  </div>
                  <PostSettledEarningForm orderItemId={item.id} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No settled sales are awaiting ledger posting.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Open payout requests</CardTitle>
          <CardDescription>
            Status changes are audited. Mark a payout paid only after an external transfer has actually completed, and provide its reference.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.withdrawals.length ? (
            <ul className="divide-y">
              {data.withdrawals.map((withdrawal) => (
                <li key={withdrawal.id} className="py-4">
                  <div className="flex flex-wrap justify-between gap-2 text-sm">
                    <span className="font-medium">{withdrawal.seller.shopName} · {withdrawal.status.toLowerCase()}</span>
                    <span>{withdrawal.currency} {withdrawal.amount.toFixed(2)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Requested {withdrawal.requestedAt.toLocaleString()} · ID {withdrawal.id}
                  </p>
                  {nextStatuses[withdrawal.status] && (
                    <WithdrawalStatusForm
                      withdrawalId={withdrawal.id}
                      expectedStatus={withdrawal.status}
                      nextStatuses={nextStatuses[withdrawal.status] ?? []}
                    />
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No open payout requests.</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
