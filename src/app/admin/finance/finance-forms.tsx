"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCommissionRule, updateWithdrawalStatus } from "@/app/seller/earnings/actions";
import { postSettledEarning } from "./actions";
import type { WithdrawalStatus } from "@/generated/prisma/enums";
import type { ActionResult } from "@/lib/action-result";

export function CommissionRuleForm() {
  const [state, action, pending] = useActionState<ActionResult<null> | null, FormData>(
    createCommissionRule,
    null
  );
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <label className="grid gap-1 text-sm">
        <span>New commission rate (%)</span>
        <Input name="rate" type="number" min="0" max="100" step="0.01" required />
      </label>
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Set rate"}</Button>
      {state && (
        <p role="status" className={state.success ? "text-sm text-emerald-600" : "text-sm text-destructive"}>
          {state.success ? "Commission rate saved." : state.error}
        </p>
      )}
    </form>
  );
}

export function PostSettledEarningForm({ orderItemId }: { orderItemId: string }) {
  const [state, action, pending] = useActionState<ActionResult<null> | null, FormData>(
    postSettledEarning,
    null
  );
  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="orderItemId" value={orderItemId} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Posting…" : "Post settled seller earning"}
      </Button>
      {state && (
        <p role="status" className={state.success ? "mt-2 text-xs text-emerald-600" : "mt-2 text-xs text-destructive"}>
          {state.success ? "Earning posted." : state.error}
        </p>
      )}
    </form>
  );
}

export function WithdrawalStatusForm({
  withdrawalId,
  expectedStatus,
  nextStatuses,
}: {
  withdrawalId: string;
  expectedStatus: WithdrawalStatus;
  nextStatuses: WithdrawalStatus[];
}) {
  const [state, action, pending] = useActionState<ActionResult<null> | null, FormData>(
    updateWithdrawalStatus,
    null
  );
  return (
    <form action={action} className="mt-3 grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
      <input type="hidden" name="withdrawalId" value={withdrawalId} />
      <input type="hidden" name="expectedStatus" value={expectedStatus} />
      <label className="grid gap-1 text-xs">
        <span>Next status</span>
        <select name="status" defaultValue={nextStatuses[0]} className="h-8 rounded-md border bg-background px-2">
          {nextStatuses.map((status) => <option key={status} value={status}>{status.toLowerCase()}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-xs">
        <span>External payout reference (required for paid)</span>
        <Input name="providerReference" maxLength={128} />
      </label>
      <label className="grid gap-1 text-xs sm:col-span-2">
        <span>Internal note</span>
        <Input name="details" maxLength={500} />
      </label>
      <div className="sm:col-span-2">
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Updating…" : "Update status"}</Button>
        {state && (
          <p role="status" className={state.success ? "mt-2 text-xs text-emerald-600" : "mt-2 text-xs text-destructive"}>
            {state.success ? "Withdrawal updated." : state.error}
          </p>
        )}
      </div>
    </form>
  );
}
