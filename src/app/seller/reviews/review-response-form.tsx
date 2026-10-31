"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { respondToReview } from "./actions";

export function ReviewResponseForm({
  reviewId,
  initialResponse,
}: {
  reviewId: string;
  initialResponse: string | null;
}) {
  const [response, setResponse] = useState(initialResponse ?? "");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, startTransition] = useTransition();

  function submit() {
    setError("");
    setSaved(false);
    startTransition(async () => {
      try {
        const result = await respondToReview(reviewId, response);
        if (!result.success) throw new Error(result.error);
        setSaved(true);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to save response");
      }
    });
  }

  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      <label className="block text-xs text-slate-400">
        Public seller response
        <textarea
          value={response}
          onChange={(event) => setResponse(event.target.value)}
          maxLength={1000}
          rows={3}
          className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white"
        />
      </label>
      {error && <p role="alert" className="mt-2 text-xs text-rose-300">{error}</p>}
      {saved && <p role="status" className="mt-2 text-xs text-emerald-200">Response saved.</p>}
      <Button
        type="button"
        size="sm"
        className="mt-2"
        disabled={busy || response.trim().length < 3}
        onClick={submit}
      >
        {busy ? "Saving…" : "Save response"}
      </Button>
    </div>
  );
}
