import { requirePageSession } from "@/lib/authorization";
import { getBuyerSupportTickets } from "../buyer-data";
import { SupportClient } from "./support-client";

type Props = { searchParams: Promise<{ orderId?: string }> };

export default async function BuyerSupportPage({ searchParams }: Props) {
  const [{ user }, params] = await Promise.all([requirePageSession(), searchParams]);
  const tickets = await getBuyerSupportTickets(user.id);
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-patina">Customer care</p>
      <h1 className="mt-2 font-display text-3xl font-semibold">Support</h1>
      <p className="mt-2 text-sm text-muted-foreground">Open a request and follow replies from the GameTrade support team.</p>
      <SupportClient tickets={tickets} buyerId={user.id} initialOrderId={params.orderId ?? ""} />
    </div>
  );
}
