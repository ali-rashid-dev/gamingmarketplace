"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createSupportAgentReply, updateSupportTicketStatus } from "@/app/dashboard/actions";

type Ticket = {
  id: string;
  subject: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  user: { name: string; email: string };
  order: { orderNumber: string } | null;
  messages: {
    id: string;
    senderId: string;
    body: string;
    createdAt: Date;
    sender: { name: string; role: string };
  }[];
};

export function SupportConsole({
  tickets,
  page,
  pageCount,
  totalCount,
}: {
  tickets: Ticket[];
  page: number;
  pageCount: number;
  totalCount: number;
}) {
  const router = useRouter();
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();
  function reply(ticketId: string) {
    setError("");
    startTransition(async () => {
      try {
        const result = await createSupportAgentReply(ticketId, replies[ticketId] ?? "");
        if (!result.success) throw new Error(result.error);
        setReplies((current) => ({ ...current, [ticketId]: "" }));
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to send reply");
      }
    });
  }
  function setStatus(ticketId: string, status: string) {
    startTransition(async () => {
      try {
        const result = await updateSupportTicketStatus(ticketId, status);
        if (!result.success) throw new Error(result.error);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to update ticket");
      }
    });
  }
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-patina">Support operations</p>
      <h1 className="mt-2 font-display text-3xl font-semibold">Support tickets</h1>
      <p className="mt-2 text-sm text-muted-foreground">Buyer requests and conversation history.</p>
      <p className="mt-2 text-xs text-muted-foreground">{totalCount} total tickets · Page {page} of {pageCount}</p>
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      {tickets.length ? (
        <div className="mt-6 space-y-4">
          {tickets.map((ticket) => (
            <article key={ticket.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold">{ticket.subject}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{ticket.user.name} · {ticket.user.email}{ticket.order ? ` · Order ${ticket.order.orderNumber}` : ""}</p>
                </div>
                <select aria-label={`Status for ${ticket.subject}`} value={ticket.status} onChange={(event) => setStatus(ticket.id, event.target.value)} disabled={busy} className="rounded-lg border border-border bg-background px-3 py-2 text-xs">
                  {["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
                </select>
              </div>
              <div className="mt-4 space-y-3">
                {ticket.messages.map((message) => (
                  <div key={message.id} className="rounded-lg border border-border bg-background p-3">
                    <p className="text-xs font-semibold">{message.sender.name} · {message.sender.role}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.body}</p>
                    <time className="mt-2 block text-[10px] text-muted-foreground">{message.createdAt.toLocaleString()}</time>
                  </div>
                ))}
              </div>
              {ticket.status !== "CLOSED" && ticket.status !== "RESOLVED" && (
                <div className="mt-4 border-t border-border pt-4">
                  <label className="block text-xs text-muted-foreground">
                    Reply to buyer
                    <textarea value={replies[ticket.id] ?? ""} onChange={(event) => setReplies((current) => ({ ...current, [ticket.id]: event.target.value }))} maxLength={3000} rows={3} className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
                  </label>
                  <button type="button" disabled={busy || !replies[ticket.id]?.trim()} onClick={() => reply(ticket.id)} className="mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">Send reply</button>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : <p className="mt-6 rounded-xl border border-dashed border-border p-8 text-sm text-muted-foreground">No support tickets are waiting.</p>}
      {pageCount > 1 && (
        <nav aria-label="Support ticket pages" className="mt-6 flex items-center justify-between gap-4">
          {page > 1 ? (
            <Link href={`/support/console?page=${page - 1}`} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">
              Previous
            </Link>
          ) : <span />}
          {page < pageCount && (
            <Link href={`/support/console?page=${page + 1}`} className="ml-auto rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">
              Next
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
