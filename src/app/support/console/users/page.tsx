import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { searchSupportUsers } from "../data";
import { UserReportForm } from "./user-report-form";

type Props = { searchParams: Promise<{ q?: string }> };

export default async function SupportUsersPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const users = await searchSupportUsers(q);
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Read-only investigation</p>
      <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Account lookup</h1>
      <p className="mt-2 text-sm text-muted-foreground">Search by name, email or exact account ID. Security credentials and payment details are never exposed here.</p>
      <form className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Input name="q" defaultValue={q} placeholder="At least 2 characters" className="min-w-0 flex-1" />
        <button className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Search users</button>
      </form>
      {q.trim().length >= 2 ? (
        users.length ? (
          <div className="mt-5 grid min-w-0 gap-3 lg:grid-cols-2">
            {users.map((user) => (
              <Card key={user.id} className="min-w-0">
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="break-words text-base">{user.name}</CardTitle>
                    <p className="mt-1 break-all text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <Badge variant="outline">
                    {user.roles.map((role) => role.replaceAll("_", " ")).join(", ")}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Account ID: <span className="break-all">{user.id}</span></p>
                  <p className="mt-2 text-xs text-muted-foreground">Joined {user.createdAt.toLocaleDateString()} · {user._count.orders} orders · {user._count.supportTickets} support cases</p>
                  {user.sellerProfile && (
                    <p className="mt-2 text-xs text-muted-foreground">Shop {user.sellerProfile.shopName} · {user.sellerProfile.status.toLowerCase()}</p>
                  )}
                  <UserReportForm reportedUserId={user.id} />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : <p className="mt-5 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">No matching accounts found.</p>
      ) : (
        <p className="mt-5 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">Enter at least 2 characters to search customer and seller accounts.</p>
      )}
    </main>
  );
}
