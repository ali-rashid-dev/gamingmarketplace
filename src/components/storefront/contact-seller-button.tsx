"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { startBuyerConversation } from "@/app/dashboard/actions";

export function ContactSellerButton({
  listingId,
  signedIn,
}: {
  listingId: string;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();
  if (!signedIn) {
    return (
      <Link href="/sign-in" className="rounded-lg border border-border px-4 py-2 text-center text-sm font-semibold text-foreground hover:border-gold/40">
        Sign in to contact seller
      </Link>
    );
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        const result = await startBuyerConversation(listingId, body);
        if (!result.success) throw new Error(result.error);
        router.push("/dashboard/messages");
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to contact seller");
      }
    });
  }
  return open ? (
    <form onSubmit={submit} className="rounded-lg border border-border bg-background p-3">
      <label className="block text-xs text-muted-foreground">
        Message the seller
        <textarea required minLength={1} maxLength={2000} rows={3} value={body} onChange={(event) => setBody(event.target.value)} className="mt-2 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground" />
      </label>
      <p className="mt-2 text-[11px] text-muted-foreground">Never send passwords or recovery codes.</p>
      {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button disabled={busy || !body.trim()} className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Sending…" : "Send message"}</button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">Cancel</button>
      </div>
    </form>
  ) : (
    <button type="button" onClick={() => setOpen(true)} className="rounded-lg border border-border px-4 py-2 text-center text-sm font-semibold text-foreground hover:border-gold/40">
      Message seller
    </button>
  );
}
