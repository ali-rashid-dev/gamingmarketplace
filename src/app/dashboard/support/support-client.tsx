"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createBuyerSupportTicket, replyToBuyerSupportTicket } from "../actions";

type Ticket = {
  id: string;
  subject: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  order: { orderNumber: string } | null;
  messages: { id: string; senderId: string; body: string; createdAt: Date }[];
};

function TicketReply({ ticket }: { ticket: Ticket }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        const result = await replyToBuyerSupportTicket(ticket.id, body);
        if (!result.success) throw new Error(result.error);
        setBody("");
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to send reply");
      }
    });
  }
  return (
    <form onSubmit={submit} className="mt-4 border-t border-border pt-4">
      {ticket.status === "CLOSED" || ticket.status === "RESOLVED" ? (
        <p className="text-xs text-muted-foreground">This ticket is closed. Open a new request if you need more help.</p>
      ) : (
        <>
          <label className="block text-xs text-muted-foreground">
            Add a message
            <textarea required value={body} onChange={(event) => setBody(event.target.value)} maxLength={3000} rows={3} className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
          </label>
          {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
          <button disabled={busy || !body.trim()} className="mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Sending…" : "Send reply"}</button>
        </>
      )}
    </form>
  );
}

export function SupportClient({
  tickets,
  buyerId,
  initialOrderId,
}: {
  tickets: Ticket[];
  buyerId: string;
  initialOrderId: string;
}) {
  const router = useRouter();
  const [orderId, setOrderId] = useState(initialOrderId);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);
  const [busy, startTransition] = useTransition();
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setCreated(false);
    startTransition(async () => {
      try {
        const result = await createBuyerSupportTicket({
          ...(orderId ? { orderId } : {}),
          subject,
          message,
        });
        if (!result.success) throw new Error(result.error);
        setCreated(true);
        setSubject("");
        setMessage("");
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to open support ticket");
      }
    });
  }
  return (
    <div className="mt-6 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
      <form onSubmit={submit} className="h-fit rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-xl font-semibold">Open a support ticket</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">For order problems, include the order reference. Support tickets aren’t formal payment disputes.</p>
        <label className="mt-4 block text-xs text-muted-foreground">
          Order ID (optional)
          <input value={orderId} onChange={(event) => setOrderId(event.target.value)} maxLength={128} className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" placeholder="Paste an order ID from its details page" />
        </label>
        <label className="mt-4 block text-xs text-muted-foreground">
          Subject
          <input required minLength={5} maxLength={120} value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
        </label>
        <label className="mt-4 block text-xs text-muted-foreground">
          How can we help?
          <textarea required minLength={5} maxLength={3000} rows={5} value={message} onChange={(event) => setMessage(event.target.value)} className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
        </label>
        <p className="mt-2 text-[11px] text-muted-foreground">Never include passwords, payment credentials, or recovery codes.</p>
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
        {created && <p role="status" className="mt-3 text-sm text-patina">Ticket created.</p>}
        <button disabled={busy} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Opening…" : "Open ticket"}</button>
      </form>

      <section>
        <h2 className="font-display text-xl font-semibold">Your support tickets</h2>
        {tickets.length ? (
          <div className="mt-4 space-y-4">
            {tickets.map((ticket) => (
              <article key={ticket.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{ticket.subject}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{ticket.order?.orderNumber ? `Order ${ticket.order.orderNumber} · ` : ""}Opened {ticket.createdAt.toLocaleDateString()}</p>
                  </div>
                  <span className="h-fit rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-gold">{ticket.status.toLowerCase().replaceAll("_", " ")}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {ticket.messages.map((entry) => (
                    <div key={entry.id} className={`rounded-lg border border-border p-3 ${entry.senderId === buyerId ? "bg-secondary/50" : "bg-background"}`}>
                      <p className="whitespace-pre-wrap text-sm leading-6">{entry.body}</p>
                      <time className="mt-2 block text-[10px] text-muted-foreground">{entry.createdAt.toLocaleString()}</time>
                    </div>
                  ))}
                </div>
                <TicketReply ticket={ticket} />
              </article>
            ))}
          </div>
        ) : <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">You haven’t opened any support tickets.</p>}
      </section>
    </div>
  );
}
