"use client";

import { useState, useTransition } from "react";
import { updateSupportReportStatus } from "../actions";

export function SupportReportQueue({ reportId, status }: { reportId: string; status: string }) {
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();
  return (
    <div>
      <label className="block text-xs text-muted-foreground">
        Report status
        <select
          value={status}
          disabled={busy}
          onChange={(event) => {
            setError("");
            startTransition(async () => {
              try {
                const result = await updateSupportReportStatus(reportId, event.target.value);
                if (!result.success) throw new Error(result.error);
              } catch (caught) {
                setError(caught instanceof Error ? caught.message : "Unable to update report");
              }
            });
          }}
          className="mt-1 min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
        >
          {["OPEN", "INVESTIGATING", "RESOLVED", "DISMISSED"].map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}
