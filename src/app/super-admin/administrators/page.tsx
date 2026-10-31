import { UserRole } from "@/generated/prisma/enums";
import { requirePageRoles } from "@/lib/authorization";
import { getPrivilegedUsers } from "../dashboard-data";
import { PrivilegedUserDirectory } from "../privileged-user-directory";

export default async function AdministratorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requirePageRoles([UserRole.SUPER_ADMIN]);
  const { q } = await searchParams;
  const query = Array.isArray(q) ? q[0] ?? "" : q ?? "";
  const users = await getPrivilegedUsers("administrators", query);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Privileged access</p>
      <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Administrators</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Search existing accounts, assign roles, or revoke active sessions. Every role and session operation is audited.
      </p>
      <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-5 text-muted-foreground">
        Privileged actions currently rely on the authenticated super-admin session; mandatory MFA or re-authentication is not configured. Do not treat this workspace as satisfying a strong-authentication policy.
      </p>
      <PrivilegedUserDirectory
        users={users}
        sessionUserId={session.user.id}
        query={query}
        emptyMessage="No administrator or matching accounts were found."
      />
    </main>
  );
}
