import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupportTicket } from "../../data";
import { TicketActions } from "./ticket-actions";

type Props = { params: Promise<{ ticketId: string }> };

export default async function SupportTicketDetailPage({ params }: Props) {
  const { ticketId } = await params;
  const ticket = await getSupportTicket(ticketId);
  if (!ticket) notFound();
  const messages = [...ticket.messages].reverse();
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <Button render={<Link href="/support/console/tickets" />} nativeButton={false} variant="ghost" size="sm">
        ← Ticket queue
      </Button>
      <div className="mt-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Ticket details</p>
          <h1 className="mt-2 break-words font-display text-2xl font-semibold sm:text-3xl">{ticket.subject}</h1>
          <p className="mt-2 break-words text-sm text-muted-foreground">
            {ticket.user.name} · {ticket.user.email} · {ticket.user.roleAssignments.map(({ role }) => role.key.replaceAll("_", " ")).join(", ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={ticket.priority === "URGENT" ? "destructive" : ticket.priority === "HIGH" ? "secondary" : "outline"}>{ticket.priority}</Badge>
          <Badge variant="outline">{ticket.status.replaceAll("_", " ")}</Badge>
          {ticket.assignedTo && <Badge variant="secondary">{ticket.assignedTo.name}</Badge>}
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Opened {ticket.createdAt.toLocaleString()} · Updated {ticket.updatedAt.toLocaleString()}
      </p>

      <div className="mt-6 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.65fr)]">
        <Card className="min-w-0">
          <CardHeader><CardTitle>Case conversation</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {messages.length ? messages.map((message) => (
              <article
                key={message.id}
                className={`min-w-0 rounded-lg border p-3 ${
                  message.isInternal
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-border bg-background"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold">
                    {message.sender.name} · {message.sender.roleAssignments.map(({ role }) => role.key.replaceAll("_", " ")).join(", ")}
                  </p>
                  {message.isInternal && <Badge variant="secondary">Internal note</Badge>}
                </div>
                <p className="mt-2 break-words whitespace-pre-wrap text-sm leading-6">{message.body}</p>
                <time className="mt-2 block text-[10px] text-muted-foreground">{message.createdAt.toLocaleString()}</time>
              </article>
            )) : (
              <p className="text-sm text-muted-foreground">No case messages have been recorded.</p>
            )}
          </CardContent>
        </Card>
        <div className="min-w-0 space-y-4">
          {ticket.order && (
            <Card className="min-w-0">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle className="text-base">Related order</CardTitle>
                <Button render={<Link href={`/support/console/orders?q=${encodeURIComponent(ticket.order.orderNumber)}`} />} nativeButton={false} variant="ghost" size="sm">Investigate</Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm font-medium">{ticket.order.orderNumber} · {ticket.order.status.replaceAll("_", " ")}</p>
                {ticket.order.items.map((item) => (
                  <div key={item.id} className="rounded-lg border border-border p-3">
                    <p className="break-words text-sm font-medium">{item.listingTitle}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Seller: {item.seller.user.name} · {item.status.toLowerCase()}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.currency} {item.totalPrice.toString()}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          <TicketActions ticketId={ticket.id} status={ticket.status} />
        </div>
      </div>
    </main>
  );
}
