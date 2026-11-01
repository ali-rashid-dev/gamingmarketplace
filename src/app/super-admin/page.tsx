import Link from "next/link";
import { connection } from "next/server";
import {
  Activity,
  ClipboardList,
  CircleDollarSign,
  Gavel,
  Headset,
  Shield,
  Users,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { getSuperAdminOverview } from "./dashboard-data";

function Metric({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof Users;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <CardDescription>{label}</CardDescription>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <p className="break-words font-display text-2xl font-semibold tabular-nums sm:text-3xl">{value}</p>
      </CardContent>
    </Card>
  );
}

export default async function SuperAdminDashboardPage() {
  await connection();
  const { metrics, recentAuditLogs } = await getSuperAdminOverview();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Super administrator</p>
        <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Platform overview</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Privileged access, marketplace activity, and recent audited actions.
        </p>
      </div>

      <section aria-label="Platform overview metrics" className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Platform users" value={metrics.users} detail="All marketplace accounts" icon={Users} />
        <Metric label="Administrators" value={metrics.administrators} detail="Admin and super-admin accounts" icon={Shield} />
        <Metric label="Support staff" value={metrics.supportStaff} detail="Accounts with support access" icon={Headset} />
        <Metric label="Total orders" value={metrics.orders} detail="Marketplace transactions" icon={Activity} />
        <Metric
          label="Platform fees"
          value={metrics.platformFees.length ? metrics.platformFees.join(" · ") : "—"}
          detail="Paid, processing, and completed orders"
          icon={CircleDollarSign}
        />
        <Metric label="Pending listings" value={metrics.pendingListings} detail="Awaiting moderation" icon={ClipboardList} />
        <Metric label="Open disputes" value={metrics.openDisputes} detail="Open or under review" icon={Gavel} />
        <Metric label="Open support tickets" value={metrics.openTickets} detail="Open or in progress" icon={Headset} />
      </section>

      <section aria-label="System health" className="mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <span className={`size-2 rounded-full ${metrics.databaseReady ? "bg-emerald-500" : "bg-destructive"}`} />
            <div>
              <h2 className="font-display font-semibold">Database</h2>
              <CardDescription className="mt-1">
                {metrics.databaseReady
                  ? "Database connection and overview queries are responding."
                  : "Database or overview data is unavailable; affected metrics may be incomplete."}
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </section>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-semibold">Recent audit activity</h2>
            <CardDescription className="mt-1">Latest recorded platform and marketplace actions.</CardDescription>
          </div>
          <Link href="/super-admin/audit-logs" className="shrink-0 text-sm text-primary hover:underline">
            View audit log
          </Link>
        </CardHeader>
        <CardContent>
          {recentAuditLogs.length ? (
            <ul className="divide-y divide-border">
              {recentAuditLogs.map((entry) => (
                <li key={entry.id} className="flex min-w-0 flex-col justify-between gap-1 py-3 sm:flex-row sm:items-center">
                  <span className="min-w-0">
                    <span className="block break-all text-sm font-medium">{entry.action}</span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {entry.actor?.name ?? "System"} · {entry.entityType} · {entry.entityId}
                    </span>
                  </span>
                  <time className="shrink-0 text-xs text-muted-foreground" dateTime={entry.createdAt.toISOString()}>
                    {entry.createdAt.toLocaleString()}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No audit activity has been recorded.</p>
          )}
        </CardContent>
      </Card>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        This overview reports database connectivity only; application uptime, background queues, backups, and provider health are not currently instrumented.
        Financial history is not editable through this workspace.
      </p>
    </main>
  );
}
