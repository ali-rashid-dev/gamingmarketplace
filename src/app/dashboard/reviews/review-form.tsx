"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { submitBuyerReview } from "../actions";

export function ReviewForm({
  eligibleItems,
}: {
  eligibleItems: { id: string; listingTitle: string; order: { orderNumber: string } }[];
}) {
  const router = useRouter();
  const [orderItemId, setOrderItemId] = useState(eligibleItems[0]?.id ?? "");
  const [rating, setRating] = useState(5);
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
        const result = await submitBuyerReview({ orderItemId: selectedOrderItemId, rating, comment });
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
      <fieldset className="mt-4">
        <legend className="text-xs text-muted-foreground">Rating: {rating} / 5</legend>
        <div className="mt-2 flex gap-1" role="group" aria-label="Choose a rating from one to five stars">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`${value} star${value === 1 ? "" : "s"}`}
              aria-pressed={rating === value}
              onClick={() => setRating(value)}
              className="rounded p-1 text-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Star className="size-5" fill={value <= rating ? "currentColor" : "none"} />
            </button>
          ))}
        </div>
      </fieldset>
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
