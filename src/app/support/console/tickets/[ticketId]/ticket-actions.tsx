"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  addSupportInternalNote,
  requestSupportTicketEvidence,
} from "../../actions";
import {
  createSupportAgentReply,
  updateSupportTicketStatus,
} from "@/app/dashboard/actions";

export function TicketActions({
  ticketId,
  status,
}: {
  ticketId: string;
  status: string;
}) {
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [evidenceRequest, setEvidenceRequest] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, startTransition] = useTransition();

  function run(action: () => Promise<{ success: boolean; error?: string }>, success: string, clear: () => void) {
    setError("");
    setNotice("");
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.success) throw new Error(result.error ?? "Unable to update case");
        clear();
        setNotice(success);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to update case");
      }
    });
  }

  const active = status !== "RESOLVED" && status !== "CLOSED";

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="text-sm text-emerald-600">{notice}</p>}
      <Card>
        <CardHeader><CardTitle className="text-base">Customer reply</CardTitle></CardHeader>
        <CardContent>
          <label className="block text-xs text-muted-foreground">
            Visible to the customer
            <textarea value={reply} onChange={(event) => setReply(event.target.value)} maxLength={3000} rows={4} className="mt-2 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground" />
          </label>
          <Button
            type="button"
            disabled={busy || !reply.trim() || !active}
            className="mt-3 w-full sm:w-auto"
            onClick={() => run(
              () => createSupportAgentReply(ticketId, reply),
              "Reply sent to the customer.",
              () => setReply("")
            )}
          >
            Send reply
          </Button>
        </CardContent>
      </Card>
      {active && (
        <Card>
          <CardHeader><CardTitle className="text-base">Request evidence</CardTitle></CardHeader>
          <CardContent>
            <label className="block text-xs text-muted-foreground">
              Describe the information or documents needed
              <textarea value={evidenceRequest} onChange={(event) => setEvidenceRequest(event.target.value)} maxLength={2000} rows={3} className="mt-2 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground" />
            </label>
            <Button
              type="button"
              variant="outline"
              disabled={busy || evidenceRequest.trim().length < 5}
              className="mt-3 w-full sm:w-auto"
              onClick={() => run(
                () => requestSupportTicketEvidence(ticketId, evidenceRequest),
                "Evidence request sent.",
                () => setEvidenceRequest("")
              )}
            >
              Send evidence request
            </Button>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle className="text-base">Internal note</CardTitle></CardHeader>
        <CardContent>
          <label className="block text-xs text-muted-foreground">
            Visible only to support staff; never shown to the customer
            <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={3000} rows={3} className="mt-2 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground" />
          </label>
          <Button
            type="button"
            variant="secondary"
            disabled={busy || !note.trim()}
            className="mt-3 w-full sm:w-auto"
            onClick={() => run(
              () => addSupportInternalNote(ticketId, note),
              "Internal note added.",
              () => setNote("")
            )}
          >
            Add internal note
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Workflow</CardTitle></CardHeader>
        <CardContent>
          <label className="block text-xs text-muted-foreground">
            Ticket status
            <select
              value={status}
              disabled={busy}
              onChange={(event) => run(
                () => updateSupportTicketStatus(ticketId, event.target.value),
                "Ticket status updated.",
                () => undefined
              )}
              className="mt-2 min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
            >
              {["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((item) => (
                <option key={item} value={item}>{item.replaceAll("_", " ")}</option>
              ))}
            </select>
          </label>
        </CardContent>
      </Card>
    </div>
  );
}
