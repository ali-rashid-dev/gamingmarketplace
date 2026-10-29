import DashboardClient from "@/app/dashboard/dashboard-client";
import { requirePageSession } from "@/lib/authorization";

export default async function DashboardPage() {
  const { user } = await requirePageSession();

  return (
    <DashboardClient
      name={user.name ?? ""}
      email={user.email}
      role={user.role ?? "BUYER"}
    />
  );
}
