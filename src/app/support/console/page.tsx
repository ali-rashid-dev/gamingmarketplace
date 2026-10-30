import Link from "next/link";
import {
  AlertTriangle,
  CheckCheck,
  CircleDollarSign,
  ClipboardList,
  Flag,
  Gavel,
  Inbox,
  UserRoundCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSupportDashboard } from "./data";

function Metric({
  label,
  value,
  detail,
  icon: Icon,
  tone = "text-primary",
}: {
  label: string;
  value: number;
  detail?: string;
  icon: typeof Inbox;
  tone?: string;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <CardDescription>{label}</CardDescription>
          {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
        </div>
        <Icon className={`size-4 shrink-0 ${tone}`} aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <p className="font-display text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

export default async function SupportConsolePage() {
  const { metrics, recentTickets, recentDisputes } = await getSupportDashboard();
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Support operations</p>
          <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Customer service dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">Triage requests, review disputes, and help customers safely.</p>
        </div>
        <Button
          render={<Link href="/support/console/tickets" />}
          nativeButton={false}
          className="w-full sm:w-auto"
        >
          <ClipboardList aria-hidden="true" />
          Open ticket queue
        </Button>
      </div>

      <section aria-label="Support workload" className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Open tickets" value={metrics.openTickets} detail="Open or being worked" icon={Inbox} />
        <Metric label="Unassigned" value={metrics.unassignedTickets} detail="Waiting for an owner" icon={ClipboardList} tone="text-amber-500" />
        <Metric label="Assigned" value={metrics.assignedTickets} detail="With a support agent" icon={UserRoundCheck} />
        <Metric label="High priority" value={metrics.highPriorityTickets} detail="High or urgent tickets" icon={AlertTriangle} tone="text-destructive" />
        <Metric label="Pending disputes" value={metrics.pendingDisputes} detail="Open or under review" icon={Gavel} tone="text-amber-500" />
        <Metric label="Overdue cases" value={metrics.overdueTickets} detail={`No update for ${metrics.overdueAfterHours}+ hours`} icon={AlertTriangle} tone="text-destructive" />
        <Metric label="Resolved today" value={metrics.resolvedToday} detail="Closed or resolved today" icon={CheckCheck} tone="text-emerald-500" />
        <Metric label="Open reports" value={metrics.openReports} detail="Abuse and suspicious activity" icon={Flag} />
      </section>

      <section className="mt-6 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div className="min-w-0">
              <CardTitle>Priority ticket queue</CardTitle>
              <CardDescription className="mt-1">Urgent cases and oldest updates are surfaced first.</CardDescription>
            </div>
            <Button render={<Link href="/support/console/tickets" />} nativeButton={false} variant="ghost" size="sm">
              View all
            </Button>
          </CardHeader>
          <CardContent>
            {recentTickets.length ? (
              <ul className="divide-y divide-border">
                {recentTickets.map((ticket) => (
                  <li key={ticket.id} className="flex min-w-0 flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <Link href={`/support/console/tickets/${ticket.id}`} className="min-w-0 hover:underline">
                      <span className="block break-words text-sm font-medium">{ticket.subject}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{ticket.user.name} · Updated {ticket.updatedAt.toLocaleDateString()}</span>
                    </Link>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={ticket.priority === "URGENT" ? "destructive" : ticket.priority === "HIGH" ? "secondary" : "outline"}>
                        {ticket.priority}
                      </Badge>
                      <Badge variant="outline">{ticket.assignedTo?.name ?? "Unassigned"}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">No active tickets need attention.</p>
            )}
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div className="min-w-0">
              <CardTitle>Disputes to review</CardTitle>
              <CardDescription className="mt-1">Open cases awaiting investigation.</CardDescription>
            </div>
            <Button render={<Link href="/support/console/disputes" />} nativeButton={false} variant="ghost" size="sm">
              View all
            </Button>
          </CardHeader>
          <CardContent>
            {recentDisputes.length ? (
              <ul className="divide-y divide-border">
                {recentDisputes.map((dispute) => (
                  <li key={dispute.id} className="py-3">
                    <Link href={`/support/console/disputes/${dispute.id}`} className="block min-w-0 hover:underline">
                      <span className="block break-words text-sm font-medium">{dispute.reason}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        Order {dispute.order.orderNumber} · {dispute.openedBy.name} · {dispute.status.replaceAll("_", " ")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">No disputes are waiting for review.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="mt-4 border-amber-500/30 bg-amber-500/5">
        <CardContent className="flex items-start gap-3 py-4">
          <CircleDollarSign className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
          <p className="text-xs leading-5 text-muted-foreground">
            Support tools are read-only for order and account investigations. Refunds, payouts, payment records, seller commissions, and administrator controls are not available in this workspace.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
