"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { assignSupportTicket, updateSupportTicketPriority } from "../actions";
import { updateSupportTicketStatus } from "@/app/dashboard/actions";

type Ticket = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: Date;
  updatedAt: Date;
  user: { name: string; email: string };
  order: { orderNumber: string } | null;
  assignedTo: { id: string; name: string } | null;
  _count: { messages: number };
};

type Agent = {
  id: string;
  name: string;
  supportAgentProfile: { isAvailable: boolean } | null;
};

export function TicketQueue({
  tickets,
  agents,
  totalCount,
  page,
  pageCount,
  status,
  assignment,
}: {
  tickets: Ticket[];
  agents: Agent[];
  totalCount: number;
  page: number;
  pageCount: number;
  status: string;
  assignment: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();

  function run(action: () => Promise<{ success: boolean; error?: string }>) {
    setError("");
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.success) throw new Error(result.error ?? "Unable to update ticket");
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to update ticket");
      }
    });
  }

  const pageHref = (nextPage: number) => {
    const query = new URLSearchParams();
    if (status !== "ALL") query.set("status", status);
    if (assignment !== "ALL") query.set("assignment", assignment);
    if (nextPage > 1) query.set("page", String(nextPage));
    const value = query.toString();
    return value ? `/support/console/tickets?${value}` : "/support/console/tickets";
  };

  return (
    <div className="mt-6">
      <form className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
        <label className="text-xs font-medium text-muted-foreground">
          Status
          <select name="status" defaultValue={status} className="mt-1 min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground">
            {["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((item) => (
              <option key={item} value={item}>{item.replaceAll("_", " ")}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Assignment
          <select name="assignment" defaultValue={assignment} className="mt-1 min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground">
            {["ALL", "MINE", "UNASSIGNED"].map((item) => (
              <option key={item} value={item}>{item === "ALL" ? "All agents" : item === "MINE" ? "Assigned to me" : "Unassigned"}</option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="outline" className="sm:col-span-2 sm:justify-self-start">Apply filters</Button>
      </form>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{totalCount} tickets · Page {page} of {pageCount}</span>
        <span>High and urgent items are sorted first within each status.</span>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      {tickets.length ? (
        <div className="mt-4 space-y-3">
          {tickets.map((ticket) => (
            <Card key={ticket.id} className="min-w-0">
              <CardContent className="grid min-w-0 gap-4 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,0.6fr)]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/support/console/tickets/${ticket.id}`} className="break-words font-semibold hover:underline">{ticket.subject}</Link>
                    <Badge variant={ticket.priority === "URGENT" ? "destructive" : ticket.priority === "HIGH" ? "secondary" : "outline"}>{ticket.priority}</Badge>
                    <Badge variant="outline">{ticket.status.replaceAll("_", " ")}</Badge>
                  </div>
                  <p className="mt-2 break-words text-xs text-muted-foreground">
                    {ticket.user.name} · {ticket.user.email}{ticket.order ? ` · Order ${ticket.order.orderNumber}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {ticket._count.messages} messages · Last updated {ticket.updatedAt.toLocaleString("en-US", { timeZone: "UTC" })}
                  </p>
                  <Link href={`/support/console/tickets/${ticket.id}`} className="mt-3 inline-flex text-xs font-medium text-primary hover:underline">
                    Open case details
                  </Link>
                </div>
                <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
                  <label className="text-[11px] text-muted-foreground">
                    Priority
                    <select
                      aria-label={`Priority for ${ticket.subject}`}
                      value={ticket.priority}
                      disabled={busy}
                      onChange={(event) => run(() => updateSupportTicketPriority(ticket.id, event.target.value))}
                      className="mt-1 min-h-9 w-full rounded-lg border border-input bg-background px-2 text-xs text-foreground"
                    >
                      {["LOW", "NORMAL", "HIGH", "URGENT"].map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                  <label className="text-[11px] text-muted-foreground">
                    Assigned agent
                    <select
                      aria-label={`Assignee for ${ticket.subject}`}
                      value={ticket.assignedTo?.id ?? ""}
                      disabled={busy}
                      onChange={(event) => run(() => assignSupportTicket(ticket.id, event.target.value))}
                      className="mt-1 min-h-9 w-full rounded-lg border border-input bg-background px-2 text-xs text-foreground"
                    >
                      <option value="">Unassigned</option>
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name}{agent.supportAgentProfile?.isAvailable === false ? " · away" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-[11px] text-muted-foreground">
                    Workflow
                    <select
                      aria-label={`Status for ${ticket.subject}`}
                      value={ticket.status}
                      disabled={busy}
                      onChange={(event) => run(() => updateSupportTicketStatus(ticket.id, event.target.value))}
                      className="mt-1 min-h-9 w-full rounded-lg border border-input bg-background px-2 text-xs text-foreground"
                    >
                      {["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((item) => (
                        <option key={item} value={item}>{item.replaceAll("_", " ")}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="mt-4 border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">No tickets match these filters.</CardContent>
        </Card>
      )}
      {pageCount > 1 && (
        <nav aria-label="Ticket pages" className="mt-5 flex items-center justify-between gap-3">
          {page > 1 ? <Button render={<Link href={pageHref(page - 1)} />} nativeButton={false} variant="outline">Previous</Button> : <span />}
          {page < pageCount && <Button render={<Link href={pageHref(page + 1)} />} nativeButton={false} variant="outline" className="ml-auto">Next</Button>}
        </nav>
      )}
    </div>
  );
}
