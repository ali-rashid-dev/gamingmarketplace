"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestWithdrawal } from "./actions";
import type { ActionResult } from "@/lib/action-result";

export function WithdrawalRequestForm({ currency }: { currency: string }) {
  const [state, action, pending] = useActionState<ActionResult<{ id: string }> | null, FormData>(
    requestWithdrawal,
    null
  );
  return (
    <form action={action} className="mt-4 flex flex-wrap items-end gap-3">
      <input type="hidden" name="currency" value={currency} />
      <label className="grid gap-1 text-xs text-muted-foreground">
        <span>Amount ({currency})</span>
        <Input name="amount" type="number" min="0.01" step="0.01" required />
      </label>
      <Button type="submit" size="sm" disabled={pending}>{pending ? "Submitting…" : "Request payout"}</Button>
      {state && (
        <p role="status" className={state.success ? "text-xs text-emerald-600" : "text-xs text-destructive"}>
          {state.success ? "Payout request recorded." : state.error}
        </p>
      )}
    </form>
  );
}
