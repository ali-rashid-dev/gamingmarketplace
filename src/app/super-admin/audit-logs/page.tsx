import prisma from "@/lib/prisma";

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { q } = await searchParams;
  const query = Array.isArray(q) ? q[0] ?? "" : q ?? "";
  const term = query.trim();
  const logs = await prisma.auditLog.findMany({
    where: term
      ? {
          OR: [
            { action: { contains: term, mode: "insensitive" } },
            { entityType: { contains: term, mode: "insensitive" } },
            { entityId: { contains: term, mode: "insensitive" } },
            { actor: { is: { name: { contains: term, mode: "insensitive" } } } },
            { actor: { is: { email: { contains: term, mode: "insensitive" } } } },
          ],
        }
      : undefined,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 100,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      metadata: true,
      ipAddress: true,
      createdAt: true,
      actor: { select: { name: true, email: true } },
    },
  });

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Security and accountability</p>
      <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Audit logs</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Read-only record of actions written by application workflows. Showing at most 100 entries, newest first.
      </p>
      <form className="mt-5 flex max-w-xl gap-2" role="search">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search action, account, or record"
          aria-label="Search audit logs"
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <button className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent">
          Search
        </button>
      </form>
      <div className="mt-6 space-y-3">
        {logs.length ? logs.map((log) => (
          <article key={log.id} className="min-w-0 rounded-xl border border-border bg-card p-4">
            <div className="flex flex-col justify-between gap-2 sm:flex-row">
              <div className="min-w-0">
                <h2 className="break-all text-sm font-semibold">{log.action}</h2>
                <p className="mt-1 break-all text-xs text-muted-foreground">
                  {log.actor?.name ?? "System"}{log.actor?.email ? ` (${log.actor.email})` : ""} · {log.entityType} · {log.entityId}
                </p>
              </div>
              <time className="shrink-0 text-xs text-muted-foreground" dateTime={log.createdAt.toISOString()}>
                {log.createdAt.toLocaleString()}
              </time>
            </div>
            {log.metadata !== null && (
              <pre className="mt-3 overflow-x-auto rounded-md bg-background p-3 text-xs leading-5 text-muted-foreground">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            )}
            {log.ipAddress && <p className="mt-2 text-xs text-muted-foreground">IP address: {log.ipAddress}</p>}
          </article>
        )) : (
          <p className="rounded-lg border border-dashed border-border p-8 text-sm text-muted-foreground">
            No audit entries match this search.
          </p>
        )}
      </div>
    </main>
  );
}
