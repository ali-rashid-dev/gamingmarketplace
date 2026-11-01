"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MessageAttachment } from "@/lib/messaging";
import { markSellerConversationRead } from "@/app/dashboard/actions";
import {
  MessageAttachmentList,
  MessageAttachmentPicker,
  ReportConversation,
} from "@/app/dashboard/messages/message-controls";
import { useMessagePolling } from "@/app/dashboard/messages/use-message-polling";
import { replyToSellerConversation } from "../dashboard-actions";

type Conversation = {
  id: string;
  buyerName: string;
  orderNumber: string | null;
  unreadCount: number;
  reports: { status: string }[];
  updatedAt: Date;
  messages: {
    id: string;
    senderId: string;
    body: string;
    attachments: unknown;
    createdAt: Date;
    readAt: Date | null;
  }[];
};

function ConversationCard({
  conversation,
  sellerUserId,
}: {
  conversation: Conversation;
  sellerUserId: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();
  const unread = conversation.unreadCount > 0;
  function reply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        const result = await replyToSellerConversation(conversation.id, body, attachments);
        if (!result.success) throw new Error(result.error);
        setBody("");
        setAttachments([]);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to send message");
      }
    });
  }
  function markRead() {
    startTransition(async () => {
      try {
        const result = await markSellerConversationRead(conversation.id);
        if (!result.success) throw new Error(result.error);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to mark messages read");
      }
    });
  }
  return (
    <article id={`conversation-${conversation.id}`} className="scroll-mt-20 rounded-2xl border border-white/[0.09] bg-card p-5">
      <div className="flex flex-wrap justify-between gap-2">
        <h2 className="font-semibold text-white">{conversation.buyerName}</h2>
        <p className="text-xs text-slate-500">{conversation.orderNumber ? `Order ${conversation.orderNumber}` : "Shop question"}</p>
        {unread && (
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">{conversation.unreadCount} unread</span>
            <button type="button" disabled={busy} onClick={markRead} className="text-xs text-primary hover:underline">
              Mark read
            </button>
          </div>
        )}
      </div>
      <div className="mt-4 space-y-3">
        {conversation.messages.length ? conversation.messages.map((message) => (
          <div key={message.id} className={`max-w-[90%] rounded-xl px-4 py-3 ${message.senderId === sellerUserId ? "ml-auto bg-cyan-300/[0.07]" : "bg-white/[0.04]"}`}>
            <p className="whitespace-pre-wrap text-sm text-slate-200">{message.body}</p>
            <MessageAttachmentList attachments={message.attachments} />
            <time className="mt-2 block text-[10px] text-slate-500">
              {new Date(message.createdAt).toLocaleString()}
              {message.senderId === sellerUserId && message.readAt ? " · Read" : ""}
            </time>
          </div>
        )) : <p className="text-sm text-slate-500">No messages in this conversation yet.</p>}
      </div>
      <form onSubmit={reply} className="mt-4 border-t border-white/[0.07] pt-4">
        <label className="block text-xs text-slate-400">
          Reply
          <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={2000} rows={3} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white" />
        </label>
        <p className="mt-1 text-[11px] text-amber-200/70">Do not send account passwords or recovery codes in chat. Secure credential handover is unavailable.</p>
        <MessageAttachmentPicker
          conversationId={conversation.id}
          attachments={attachments}
          onChange={setAttachments}
          disabled={busy}
        />
        {error && <p role="alert" className="mt-2 text-xs text-rose-300">{error}</p>}
        <button disabled={busy || (!body.trim() && !attachments.length)} className="mt-3 rounded-lg bg-cyan-300 px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-50">Send reply</button>
      </form>
      <div className="mt-4 border-t border-white/[0.07] pt-3">
        <ReportConversation conversationId={conversation.id} reported={conversation.reports.length > 0} />
      </div>
    </article>
  );
}

export function SellerMessages({
  conversations,
  sellerUserId,
}: {
  conversations: Conversation[];
  sellerUserId: string;
}) {
  useMessagePolling();
  if (!conversations.length) {
    return <p className="mt-7 rounded-2xl border border-dashed border-white/15 p-8 text-sm text-slate-400">Customer conversations will appear here.</p>;
  }
  return <div className="mt-7 space-y-4">{conversations.map((conversation) => <ConversationCard key={conversation.id} conversation={conversation} sellerUserId={sellerUserId} />)}</div>;
}
