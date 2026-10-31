"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reportReview } from "../actions";

export function ReportReviewButton({ reviewId }: { reviewId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("OTHER");
  const [details, setDetails] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();

  function submit() {
    setError("");
    setNotice("");
    startTransition(async () => {
      try {
        const result = await reportReview(reviewId, reason, details);
        if (!result.success) throw new Error(result.error);
        setNotice("Report submitted for review.");
        setOpen(false);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to report review");
      }
    });
  }

  return (
    <div className="mt-3">
      {!open ? (
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(true)}>
          <Flag aria-hidden="true" />
          Report review
        </Button>
      ) : (
        <div className="space-y-2 rounded-lg border border-border p-3">
          <label className="block text-xs text-muted-foreground">
            Reason
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-2 py-2 text-sm text-foreground"
            >
              <option value="ABUSE">Abusive content</option>
              <option value="HARASSMENT">Harassment</option>
              <option value="SPAM">Spam or irrelevant</option>
              <option value="FRAUD">Fraud or false claims</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
          <label className="block text-xs text-muted-foreground">
            Details (optional)
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              maxLength={1000}
              rows={3}
              className="mt-1 w-full rounded-md border border-input bg-background px-2 py-2 text-sm text-foreground"
            />
          </label>
          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={busy} onClick={submit}>
              {busy ? "Submitting…" : "Submit report"}
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {notice && <p role="status" className="mt-2 text-xs text-muted-foreground">{notice}</p>}
    </div>
  );
}
