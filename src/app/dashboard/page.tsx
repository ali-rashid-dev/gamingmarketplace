import DashboardClient from "@/app/dashboard/dashboard-client";
import { requirePageSession } from "@/lib/authorization";
import { getBuyerOverview } from "./buyer-data";

export default async function DashboardPage() {
  const { user } = await requirePageSession();
  const overview = await getBuyerOverview(user.id);

  return (
    <DashboardClient
      name={user.name ?? ""}
      overview={overview}
    />
  );
}
