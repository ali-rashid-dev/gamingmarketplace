import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import type { getPrivilegedUsers } from "./dashboard-data";
import { UserAccessControls } from "./user-access-controls";

type PrivilegedUser = Awaited<ReturnType<typeof getPrivilegedUsers>>[number];

export function PrivilegedUserDirectory({
  users,
  sessionUserId,
  query,
  emptyMessage,
}: {
  users: PrivilegedUser[];
  sessionUserId: string;
  query: string;
  emptyMessage: string;
}) {
  return (
    <>
      <form className="mt-5 flex max-w-xl gap-2" role="search">
        <Input
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Search any account by name or email"
          aria-label="Search accounts by name or email"
        />
        <Button type="submit" variant="outline">Search</Button>
      </form>

      <section aria-label="Account directory" className="mt-6 space-y-3">
        {users.length ? users.map((user) => (
          <Card key={user.id}>
            <CardContent className="grid min-w-0 gap-4 py-1 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold">{user.name}</p>
                <p className="mt-1 break-all text-xs text-muted-foreground">{user.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {user.roles.map((role) => role.replaceAll("_", " ")).join(", ")} · {user.emailVerified ? "Email verified" : "Email not verified"} · {user._count.sessions} active session(s)
                </p>
              </div>
              <UserAccessControls
                userId={user.id}
                roles={user.roles}
                isSelf={user.id === sessionUserId}
              />
            </CardContent>
          </Card>
        )) : (
          <Empty className="rounded-xl border">
            <EmptyHeader>
              <EmptyTitle>No accounts found</EmptyTitle>
              <EmptyDescription>{emptyMessage}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </section>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        At most 50 accounts are shown. Role options follow the application’s fixed role structure. Unverified accounts should not be granted privileged access.
      </p>
    </>
  );
}
