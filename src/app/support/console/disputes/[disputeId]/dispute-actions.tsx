"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { escalateSupportDispute, requestDisputeEvidence } from "../../actions";

export function DisputeActions({
  disputeId,
  active,
  status,
}: {
  disputeId: string;
  active: boolean;
  status: string;
}) {
  const [request, setRequest] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, startTransition] = useTransition();

  function run(action: () => Promise<{ success: boolean; error?: string }>, success: string) {
    setError("");
    setNotice("");
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.success) throw new Error(result.error ?? "Unable to update dispute");
        setNotice(success);
        setRequest("");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to update dispute");
      }
    });
  }

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="text-sm text-emerald-600">{notice}</p>}
      {active && status !== "UNDER_REVIEW" && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={busy}
          onClick={() => run(() => escalateSupportDispute(disputeId), "Dispute escalated for review.")}
        >
          Escalate for review
        </Button>
      )}
      {active && (
        <Card>
          <CardHeader><CardTitle className="text-base">Request evidence</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xs leading-5 text-muted-foreground">The buyer and sellers on this order will be notified.</p>
            <label className="mt-3 block text-xs text-muted-foreground">
              Evidence needed
              <textarea value={request} onChange={(event) => setRequest(event.target.value)} maxLength={2000} rows={4} className="mt-2 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground" />
            </label>
            <Button
              type="button"
              disabled={busy || request.trim().length < 5}
              className="mt-3 w-full"
              onClick={() => run(() => requestDisputeEvidence(disputeId, request), "Evidence request sent to the order participants.")}
            >
              Send evidence request
            </Button>
          </CardContent>
        </Card>
      )}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="py-4 text-xs leading-5 text-muted-foreground">
          Support can investigate and escalate this case. This workspace cannot issue refunds, release funds, or make financial adjustments.
        </CardContent>
      </Card>
    </div>
  );
}
