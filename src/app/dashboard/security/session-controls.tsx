"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { revokeBuyerOtherSessions } from "../actions";

type SessionInfo = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  current: boolean;
};

export function SessionControls({ sessions }: { sessions: SessionInfo[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, startTransition] = useTransition();
  function revoke() {
    setError("");
    setSaved(false);
    startTransition(async () => {
      try {
        const result = await revokeBuyerOtherSessions();
        if (!result.success) throw new Error(result.error);
        setSaved(true);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to revoke sessions");
      }
    });
  }
  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">Active sessions</h2>
          <p className="mt-1 text-xs text-muted-foreground">Sign out other devices while keeping this session active.</p>
        </div>
        {sessions.some((session) => !session.current) && (
          <button type="button" disabled={busy} onClick={revoke} className="min-h-10 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:border-gold/40 disabled:opacity-50">
            {busy ? "Signing out…" : "Sign out other sessions"}
          </button>
        )}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      {saved && <p role="status" className="mt-3 text-sm text-patina">Other sessions have been revoked.</p>}
      {sessions.length ? (
        <ul className="mt-4 divide-y divide-border">
          {sessions.map((session) => (
            <li key={session.id} className="py-3 first:pt-0 last:pb-0">
              <p className="text-sm font-medium">{session.current ? "This device" : "Signed-in device"}{session.current && <span className="ml-2 text-xs text-patina">Current</span>}</p>
              <p className="mt-1 break-words text-xs text-muted-foreground">{session.userAgent || "Device information unavailable"}{session.ipAddress ? ` · ${session.ipAddress}` : ""}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Last active {session.updatedAt.toLocaleString("en-US", { timeZone: "UTC" })} · Expires{" "}
                {session.expiresAt.toLocaleDateString("en-US", { timeZone: "UTC" })}
              </p>
            </li>
          ))}
        </ul>
      ) : <p className="mt-4 text-sm text-muted-foreground">No active sessions found.</p>}
    </section>
  );
}
