"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { submitBuyerReview } from "../actions";

export function ReviewForm({
  eligibleItems,
}: {
  eligibleItems: { id: string; listingTitle: string; order: { orderNumber: string } }[];
}) {
  const router = useRouter();
  const [orderItemId, setOrderItemId] = useState(eligibleItems[0]?.id ?? "");
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, startTransition] = useTransition();
  const selectedOrderItemId = eligibleItems.some((item) => item.id === orderItemId)
    ? orderItemId
    : eligibleItems[0]?.id ?? "";

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved(false);
    startTransition(async () => {
      try {
        const result = await submitBuyerReview({ orderItemId: selectedOrderItemId, rating: Number(rating), comment });
        if (!result.success) throw new Error(result.error);
        setSaved(true);
        setComment("");
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to submit review");
      }
    });
  }

  return (
    <form onSubmit={submit} className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
      <h2 className="font-display text-xl font-semibold">Review a purchase</h2>
      <p className="mt-1 text-xs text-muted-foreground">Only completed orders are eligible. One review per purchase.</p>
      <label className="mt-4 block text-xs text-muted-foreground">
        Completed purchase
        <select value={selectedOrderItemId} onChange={(event) => setOrderItemId(event.target.value)} className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
          {eligibleItems.map((item) => (
            <option key={item.id} value={item.id}>{item.listingTitle} · {item.order.orderNumber}</option>
          ))}
        </select>
      </label>
      <label className="mt-4 block text-xs text-muted-foreground">
        Rating
        <select value={rating} onChange={(event) => setRating(event.target.value)} className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
          {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} / 5</option>)}
        </select>
      </label>
      <label className="mt-4 block text-xs text-muted-foreground">
        Feedback
        <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={2000} rows={4} className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
      </label>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      {saved && <p role="status" className="mt-3 text-sm text-patina">Review submitted.</p>}
      <button disabled={busy || !selectedOrderItemId} className="mt-4 min-h-10 w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 sm:w-auto">
        {busy ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
