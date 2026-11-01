"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DisputeDecision } from "@/generated/prisma/enums";
import { addDisputeMessage, assignDispute, decideDispute } from "@/app/disputes/actions";
import { escalateSupportDispute, requestDisputeEvidence } from "../../actions";

export function DisputeActions({
  disputeId,
  active,
  status,
  assignedToId,
  agents,
  itemTotal,
}: {
  disputeId: string;
  active: boolean;
  status: string;
  assignedToId: string | null;
  agents: { id: string; name: string }[];
  itemTotal: string | null;
}) {
  const router = useRouter();
  const [request, setRequest] = useState("");
  const [reply, setReply] = useState("");
  const [decision, setDecision] = useState<DisputeDecision>(DisputeDecision.NO_FINANCIAL_ADJUSTMENT);
  const [resolution, setResolution] = useState("");
  const [partialAmount, setPartialAmount] = useState("");
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
        router.refresh();
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
          <CardHeader><CardTitle className="text-base">Case assignment</CardTitle></CardHeader>
          <CardContent>
            <label className="block text-xs text-muted-foreground">
              Assigned support agent
              <select
                value={assignedToId ?? ""}
                onChange={(event) => {
                  if (event.target.value) run(() => assignDispute(disputeId, event.target.value), "Case assignment updated.");
                }}
                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="">Unassigned</option>
                {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
              </select>
            </label>
          </CardContent>
        </Card>
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
      {active && (
        <Card>
          <CardHeader><CardTitle className="text-base">Respond to participants</CardTitle></CardHeader>
          <CardContent>
            <textarea value={reply} onChange={(event) => setReply(event.target.value)} maxLength={3000} rows={4} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground" />
            <Button
              type="button"
              disabled={busy || reply.trim().length < 1}
              className="mt-3 w-full"
              onClick={() => run(async () => {
                const result = await addDisputeMessage(disputeId, reply);
                if (result.success) setReply("");
                return result;
              }, "Response added to case history.")}
            >
              Send response
            </Button>
          </CardContent>
        </Card>
      )}
      {active && (
        <Card>
          <CardHeader><CardTitle className="text-base">Record case decision</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xs leading-5 text-muted-foreground">
              This records a case determination only. Refunds and fund release are not connected to a payment provider and will not be executed here.
            </p>
            <label className="mt-3 block text-xs text-muted-foreground">
              Decision
              <select value={decision} onChange={(event) => setDecision(event.target.value as DisputeDecision)} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground">
                {Object.values(DisputeDecision).map((value) => <option key={value} value={value}>{value.replaceAll("_", " ").toLowerCase()}</option>)}
              </select>
            </label>
            {decision === DisputeDecision.PARTIAL_REFUND && (
              <label className="mt-3 block text-xs text-muted-foreground">
                Partial amount (maximum {itemTotal ?? "unavailable"})
                <input inputMode="decimal" value={partialAmount} onChange={(event) => setPartialAmount(event.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground" />
              </label>
            )}
            <label className="mt-3 block text-xs text-muted-foreground">
              Decision explanation
              <textarea value={resolution} onChange={(event) => setResolution(event.target.value)} minLength={10} maxLength={2000} rows={4} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground" />
            </label>
            <Button
              type="button"
              disabled={busy || resolution.trim().length < 10 || (decision === DisputeDecision.PARTIAL_REFUND && !partialAmount)}
              className="mt-3 w-full"
              onClick={() => run(() => decideDispute({
                disputeId,
                decision,
                resolution,
                ...(decision === DisputeDecision.PARTIAL_REFUND ? { partialAmount } : {}),
              }), "Decision recorded. No payment or balance was changed.")}
            >
              Record decision
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
