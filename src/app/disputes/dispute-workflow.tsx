"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  addDisputeMessage,
  appealDispute,
  openBuyerDispute,
  uploadDisputeEvidence,
} from "./actions";

type DisputeRecord = {
  id: string;
  status: string;
  reasonCode: string;
  reason: string;
  description: string;
  decision: string | null;
  decisionAmount: string | null;
  resolution: string | null;
  resolvedAt: Date | null;
  appealedAt: Date | null;
  appealOpen?: boolean;
  createdAt: Date;
  messages: {
    id: string;
    body: string;
    createdAt: Date;
    senderId: string;
    sender: { name: string };
  }[];
  evidence: {
    id: string;
    url: string;
    name: string | null;
    description: string | null;
    contentType: string | null;
    size: number | null;
    createdAt: Date;
    submittedBy: { name: string };
  }[];
  events: {
    id: string;
    type: string;
    createdAt: Date;
    actor: { name: string };
  }[];
};

const reasonOptions = [
  ["NOT_DELIVERED", "Digital goods not delivered"],
  ["INVALID_GOODS", "Goods are invalid or unusable"],
  ["NOT_AS_DESCRIBED", "Goods are not as described"],
  ["OTHER", "Other order issue"],
] as const;
const activeStatuses = new Set(["OPEN", "UNDER_REVIEW"]);
const finalStatuses = new Set(["RESOLVED", "BUYER_FAVOR", "SELLER_FAVOR", "CLOSED"]);

function DisputeCard({
  dispute,
  buyerId,
  canAppeal,
}: {
  dispute: DisputeRecord;
  buyerId: string;
  canAppeal: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [appeal, setAppeal] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, startTransition] = useTransition();
  const active = activeStatuses.has(dispute.status);
  const canAppealNow = canAppeal &&
    finalStatuses.has(dispute.status) &&
    dispute.appealOpen === true;

  function run(action: () => Promise<{ success: boolean; error?: string }>, success: string) {
    setError("");
    setNotice("");
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.success) throw new Error(result.error ?? "Unable to update case");
        setNotice(success);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to update case");
      }
    });
  }

  return (
    <article id={`dispute-${dispute.id}`} className="scroll-mt-24 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{dispute.reason}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Opened {dispute.createdAt.toLocaleString()} · {dispute.reasonCode.replaceAll("_", " ").toLowerCase()}
          </p>
        </div>
        <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide">
          {dispute.status.replaceAll("_", " ")}
        </span>
      </div>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">{dispute.description}</p>
      {dispute.decision && (
        <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3">
          <p className="text-xs font-semibold">Support decision: {dispute.decision.replaceAll("_", " ").toLowerCase()}</p>
          {dispute.decisionAmount && <p className="mt-1 text-xs">Determined amount: {dispute.decisionAmount}</p>}
          {dispute.resolution && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{dispute.resolution}</p>}
          <p className="mt-2 text-[11px] text-muted-foreground">A decision is recorded for review; no funds have been moved or refunded.</p>
        </div>
      )}
      {dispute.evidence.length > 0 && (
        <section className="mt-4 border-t border-border pt-3">
          <h4 className="text-xs font-semibold">Evidence</h4>
          <ul className="mt-2 space-y-2">
            {dispute.evidence.map((entry) => (
              <li key={entry.id} className="text-xs">
                <span className="font-medium">{entry.submittedBy.name}</span>
                {entry.description && <span className="text-muted-foreground"> · {entry.description}</span>}
                {" · "}
                <a href={entry.url} target="_blank" rel="noreferrer" className="break-all text-primary underline">
                  {entry.name ?? "Open evidence"}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="mt-4 border-t border-border pt-3">
        <h4 className="text-xs font-semibold">Case history and responses</h4>
        <div className="mt-3 space-y-2">
          {dispute.events.map((event) => (
            <p key={event.id} className="text-[11px] text-muted-foreground">
              {event.actor.name} · {event.type.replaceAll("_", " ").toLowerCase()} · {event.createdAt.toLocaleString()}
            </p>
          ))}
          {dispute.messages.map((message) => (
            <div key={message.id} className={`rounded-lg border border-border p-3 ${message.senderId === buyerId ? "bg-secondary/50" : "bg-background"}`}>
              <p className="text-[11px] font-medium text-muted-foreground">{message.sender.name} · {message.createdAt.toLocaleString()}</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm">{message.body}</p>
            </div>
          ))}
        </div>
      </section>
      {active && (
        <>
          <form
            className="mt-4 border-t border-border pt-4"
            onSubmit={(event) => {
              event.preventDefault();
              run(async () => {
                const result = await addDisputeMessage(dispute.id, body);
                if (result.success) setBody("");
                return result;
              }, "Response added.");
            }}
          >
            <label className="block text-xs text-muted-foreground">
              Add a response
              <textarea required minLength={1} maxLength={3000} rows={3} value={body} onChange={(event) => setBody(event.target.value)} className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
            </label>
            <button disabled={busy || !body.trim()} className="mt-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">
              Send response
            </button>
          </form>
          <form
            className="mt-4 border-t border-border pt-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!file) return;
              run(async () => {
                const result = await uploadDisputeEvidence(dispute.id, file, description);
                if (result.success) {
                  setFile(null);
                  setDescription("");
                }
                return result;
              }, "Evidence added.");
            }}
          >
            <label className="block text-xs text-muted-foreground">
              Add evidence (JPEG, PNG, WebP or PDF; 8 MB max)
              <input required type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)} className="mt-2 block w-full text-xs" />
            </label>
            <label className="mt-3 block text-xs text-muted-foreground">
              Caption (optional)
              <input maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
            </label>
            <button disabled={busy || !file} className="mt-2 rounded-lg border border-border px-4 py-2 text-xs font-semibold disabled:opacity-50">
              Upload evidence
            </button>
          </form>
        </>
      )}
      {canAppealNow && (
        <form
          className="mt-4 border-t border-border pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            run(() => appealDispute(dispute.id, appeal), "Appeal submitted; support will review the case again.");
          }}
        >
          <label className="block text-xs text-muted-foreground">
            Appeal this decision (within 7 days)
            <textarea required minLength={10} maxLength={2000} rows={3} value={appeal} onChange={(event) => setAppeal(event.target.value)} className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
          </label>
          <button disabled={busy || appeal.trim().length < 10} className="mt-2 rounded-lg border border-border px-4 py-2 text-xs font-semibold disabled:opacity-50">
            Submit appeal
          </button>
        </form>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="mt-3 text-sm text-emerald-600">{notice}</p>}
    </article>
  );
}

export function BuyerDisputeWorkflow({
  orderItemId,
  orderItemStatus,
  orderStatus,
  disputes,
  deadline,
  canOpen,
  delivered,
  buyerId,
}: {
  orderItemId: string;
  orderItemStatus: string;
  orderStatus: string;
  disputes: DisputeRecord[];
  deadline: Date;
  canOpen: boolean;
  delivered: boolean;
  buyerId: string;
}) {
  const router = useRouter();
  const [reasonCode, setReasonCode] = useState<(typeof reasonOptions)[number][0]>(
    delivered ? "INVALID_GOODS" : "NOT_DELIVERED"
  );
  const [description, setDescription] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();
  const hasActive = disputes.some((dispute) => activeStatuses.has(dispute.status));
  const allowedItem = !["CANCELLED", "REFUNDED"].includes(orderItemStatus);
  const canOpenCase = canOpen && allowedItem &&
    ["PAID", "PROCESSING", "COMPLETED", "DISPUTED"].includes(orderStatus) &&
    !hasActive;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        const result = await openBuyerDispute({ orderItemId, reasonCode, description });
        if (!result.success) throw new Error(result.error);
        setOpen(false);
        setDescription("");
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to open buyer-protection case");
      }
    });
  }

  return (
    <div className="mt-4 space-y-3">
      {disputes.map((dispute) => (
        <DisputeCard key={dispute.id} dispute={dispute} buyerId={buyerId} canAppeal />
      ))}
      {canOpenCase && (
        <div>
          {!open ? (
            <button type="button" onClick={() => setOpen(true)} className="text-xs font-semibold text-gold hover:underline">
              Open buyer-protection case · by {deadline.toLocaleDateString()}
            </button>
          ) : (
            <form onSubmit={submit} className="rounded-lg border border-border p-4">
              <h4 className="font-semibold">Open a buyer-protection case</h4>
              <label className="mt-3 block text-xs text-muted-foreground">
                Reason
                <select value={reasonCode} onChange={(event) => setReasonCode(event.target.value as typeof reasonCode)} className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
                  {reasonOptions
                    .filter(([value]) => delivered || value === "NOT_DELIVERED")
                    .filter(([value]) => !delivered || value !== "NOT_DELIVERED")
                    .map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="mt-3 block text-xs text-muted-foreground">
                Describe the issue
                <textarea required minLength={10} maxLength={3000} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
              </label>
              <p className="mt-2 text-[11px] text-muted-foreground">Do not include passwords, recovery codes, or payment credentials.</p>
              {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
              <div className="mt-3 flex gap-2">
                <button disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">
                  {busy ? "Opening…" : "Open case"}
                </button>
                <button type="button" disabled={busy} onClick={() => setOpen(false)} className="rounded-lg border border-border px-4 py-2 text-xs">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export function SellerDisputeCase({
  dispute,
  sellerId,
}: {
  dispute: DisputeRecord;
  sellerId: string;
}) {
  return <DisputeCard dispute={dispute} buyerId={sellerId} canAppeal={false} />;
}
