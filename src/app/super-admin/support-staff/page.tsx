import { UserRole } from "@/generated/prisma/enums";
import { requirePageRoles } from "@/lib/authorization";
import { getPrivilegedUsers } from "../dashboard-data";
import { PrivilegedUserDirectory } from "../privileged-user-directory";

export default async function SupportStaffPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requirePageRoles([UserRole.SUPER_ADMIN]);
  const { q } = await searchParams;
  const query = Array.isArray(q) ? q[0] ?? "" : q ?? "";
  const users = await getPrivilegedUsers("support", query);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Privileged access</p>
      <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Support staff</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Review support access, assign roles to existing accounts, or revoke sessions for staff accounts.
      </p>
      <PrivilegedUserDirectory
        users={users}
        sessionUserId={session.user.id}
        query={query}
        emptyMessage="No support staff or matching accounts were found."
      />
    </main>
  );
}
