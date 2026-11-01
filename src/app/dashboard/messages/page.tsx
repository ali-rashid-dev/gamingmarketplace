import { requirePageSession } from "@/lib/authorization";
import { getBuyerConversations } from "../buyer-data";
import { BuyerMessages } from "./buyer-messages";

export default async function BuyerMessagesPage() {
  const { user } = await requirePageSession();
  const conversations = await getBuyerConversations(user.id);
  const unreadCount = conversations.reduce((total, conversation) => total + conversation.unreadCount, 0);
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-patina">Communication</p>
      <h1 className="mt-2 font-display text-3xl font-semibold">Messages</h1>
      <p className="mt-2 text-sm text-muted-foreground">Conversations connected to your orders and sellers.</p>
      <p className="mt-2 text-xs text-muted-foreground">{unreadCount} unread messages</p>
      <BuyerMessages conversations={conversations} buyerId={user.id} />
    </div>
  );
}
