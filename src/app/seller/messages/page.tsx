import { getSellerConversations } from "../dashboard-data";
import { SellerMessages } from "./seller-messages";

export default async function SellerMessagesPage() {
  const { conversations, sellerUserId } = await getSellerConversations();
  const unreadCount = conversations.reduce((total, conversation) => total + conversation.unreadCount, 0);
  return (
    <main className="mx-auto max-w-5xl px-5 py-9 sm:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Customer support</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-white">Messages</h1>
      <p className="mt-2 text-sm text-slate-400">Conversations connected to your shop and orders.</p>
      <p className="mt-2 text-xs text-slate-500">{unreadCount} unread messages</p>
      <SellerMessages conversations={conversations} sellerUserId={sellerUserId} />
    </main>
  );
}
