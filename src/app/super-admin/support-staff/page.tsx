import { UserRole } from "@/generated/prisma/enums";
import { requirePageRoles } from "@/lib/authorization";
import { getPrivilegedUsers } from "../dashboard-data";
import { UserAccessControls } from "../user-access-controls";

export default async function SupportStaffPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requirePageRoles([UserRole.SUPER_ADMIN]);
  const { q = "" } = await searchParams;
  const users = await getPrivilegedUsers("support", q);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Privileged access</p>
      <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Support staff</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Review support access, assign roles to existing accounts, or revoke sessions for staff accounts.
      </p>
      <form className="mt-5 flex max-w-xl gap-2" role="search">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search any account by name or email"
          aria-label="Search accounts by name or email"
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <button className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent">
          Search
        </button>
      </form>

      <section aria-label="Support staff accounts" className="mt-6 space-y-3">
        {users.length ? users.map((user) => (
          <article key={user.id} className="grid min-w-0 gap-4 rounded-xl border border-border bg-card p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="min-w-0">
              <p className="break-words text-sm font-semibold">{user.name}</p>
              <p className="mt-1 break-all text-xs text-muted-foreground">{user.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {user.role.replaceAll("_", " ")} · {user.emailVerified ? "Email verified" : "Email not verified"} · {user._count.sessions} active session(s)
              </p>
            </div>
            <UserAccessControls
              userId={user.id}
              role={user.role}
              isSelf={user.id === session.user.id}
            />
          </article>
        )) : (
          <p className="rounded-lg border border-dashed border-border p-8 text-sm text-muted-foreground">
            No matching accounts found.
          </p>
        )}
      </section>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        At most 50 accounts are shown. Searches include any account; changes to a role are recorded in the audit log.
      </p>
    </main>
  );
}
