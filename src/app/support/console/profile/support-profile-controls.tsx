"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateSupportAvailability } from "../actions";

export function SupportProfileControls({
  name,
  email,
  role,
  isAvailable: initialAvailability,
  assignedOpenTickets,
}: {
  name: string;
  email: string;
  role: string;
  isAvailable: boolean;
  assignedOpenTickets: number;
}) {
  const [isAvailable, setIsAvailable] = useState(initialAvailability);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, startTransition] = useTransition();
  function toggle() {
    const next = !isAvailable;
    setError("");
    setNotice("");
    startTransition(async () => {
      try {
        const result = await updateSupportAvailability(next);
        if (!result.success) throw new Error(result.error);
        setIsAvailable(result.data.isAvailable);
        setNotice("Availability saved.");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to update availability");
      }
    });
  }
  return (
    <Card className="mt-5">
      <CardHeader><CardTitle>Agent profile</CardTitle></CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div><dt className="text-xs text-muted-foreground">Name</dt><dd className="mt-1 break-words text-sm font-medium">{name}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Email</dt><dd className="mt-1 break-all text-sm font-medium">{email}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Role</dt><dd className="mt-1"><Badge variant="outline">{role}</Badge></dd></div>
          <div><dt className="text-xs text-muted-foreground">Assigned active tickets</dt><dd className="mt-1 text-sm font-medium tabular-nums">{assignedOpenTickets}</dd></div>
        </dl>
        <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Available for assignment</p>
            <p className="mt-1 text-xs text-muted-foreground">When away, the queue will still show you as an existing ticket owner.</p>
          </div>
          <Button type="button" variant={isAvailable ? "outline" : "secondary"} onClick={toggle} disabled={busy} className="w-full sm:w-auto">
            {busy ? "Saving…" : isAvailable ? "Set away" : "Set available"}
          </Button>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
        {notice && <p role="status" className="mt-3 text-sm text-emerald-600">{notice}</p>}
      </CardContent>
    </Card>
  );
}
