"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createSupportReport } from "../actions";

export function UserReportForm({ reportedUserId }: { reportedUserId: string }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("SUSPICIOUS_ACTIVITY");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, startTransition] = useTransition();
  function submit() {
    setError("");
    setSaved(false);
    startTransition(async () => {
      try {
        const result = await createSupportReport({ reportedUserId, category, details });
        if (!result.success) throw new Error(result.error);
        setDetails("");
        setSaved(true);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to submit report");
      }
    });
  }
  return (
    <div className="mt-4 border-t border-border pt-3">
      {!open ? (
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>Report suspicious activity</Button>
      ) : (
        <div className="space-y-2">
          <label className="block text-xs text-muted-foreground">
            Report category
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1 min-h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground">
              {["ABUSE", "SCAM", "HARASSMENT", "SUSPICIOUS_ACTIVITY", "OTHER"].map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
            </select>
          </label>
          <label className="block text-xs text-muted-foreground">
            Case notes
            <textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={3000} rows={3} className="mt-1 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground" />
          </label>
          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
          {saved && <p role="status" className="text-xs text-emerald-600">Report added to the review queue.</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={busy || details.trim().length < 10} onClick={submit}>Submit report</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
