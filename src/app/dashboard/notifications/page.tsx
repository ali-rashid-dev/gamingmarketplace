import { requirePageSession } from "@/lib/authorization";
import { getBuyerNotifications } from "../buyer-data";
import { NotificationList } from "./notification-list";

export default async function BuyerNotificationsPage() {
  const { user } = await requirePageSession();
  const notifications = await getBuyerNotifications(user.id);
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-patina">Account activity</p>
      <h1 className="mt-2 font-display text-3xl font-semibold">Notifications</h1>
      <p className="mt-2 text-sm text-muted-foreground">Order, payment, and account updates.</p>
      <NotificationList notifications={notifications} />
    </div>
  );
}
