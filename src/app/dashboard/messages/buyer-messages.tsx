"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { markBuyerConversationRead, sendBuyerMessage } from "../actions";

type Conversation = {
  id: string;
  updatedAt: Date;
  seller: { name: string };
  order: { id: string; orderNumber: string } | null;
  messages: {
    id: string;
    senderId: string;
    body: string;
    createdAt: Date;
    readAt: Date | null;
  }[];
};

function ConversationCard({
  conversation,
  buyerId,
}: {
  conversation: Conversation;
  buyerId: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();
  const unread = conversation.messages.some(
    (message) => message.senderId !== buyerId && !message.readAt,
  );

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        const result = await sendBuyerMessage(conversation.id, body);
        if (!result.success) throw new Error(result.error);
        setBody("");
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to send message");
      }
    });
  }

  function markRead() {
    startTransition(async () => {
      try {
        const result = await markBuyerConversationRead(conversation.id);
        if (!result.success) throw new Error(result.error);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to mark messages read");
      }
    });
  }

  return (
    <article className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="break-words font-semibold">{conversation.seller.name}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{conversation.order?.orderNumber ?? "Seller conversation"}</p>
        </div>
        {unread && (
          <button type="button" disabled={busy} onClick={markRead} className="text-xs font-semibold text-gold hover:underline">
            Mark read
          </button>
        )}
      </div>
      <div className="mt-4 space-y-3">
        {conversation.messages.length ? conversation.messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[92%] break-words rounded-lg border border-border px-3 py-3 sm:px-4 ${
              message.senderId === buyerId ? "ml-auto bg-secondary/60" : "bg-background"
            }`}
          >
            <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.body}</p>
            <time className="mt-2 block text-[10px] text-muted-foreground">
              {message.createdAt.toLocaleString("en-US", { timeZone: "UTC" })}
            </time>
          </div>
        )) : <p className="text-sm text-muted-foreground">No messages in this conversation yet.</p>}
      </div>
      <form onSubmit={submit} className="mt-4 border-t border-border pt-4">
        <label className="block text-xs text-muted-foreground">
          Reply to seller
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={2000}
            rows={3}
            required
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
          />
        </label>
        <p className="mt-2 text-[11px] text-muted-foreground">Never share passwords or recovery codes in messages.</p>
        {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
        <button disabled={busy || !body.trim()} className="mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">
          Send message
        </button>
      </form>
    </article>
  );
}

export function BuyerMessages({
  conversations,
  buyerId,
}: {
  conversations: Conversation[];
  buyerId: string;
}) {
  if (!conversations.length) {
    return (
      <p className="mt-6 rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground sm:p-8">
        Your buyer–seller conversations will appear here.
      </p>
    );
  }
  return (
    <div className="mt-6 space-y-4">
      {conversations.map((conversation) => (
        <ConversationCard key={conversation.id} conversation={conversation} buyerId={buyerId} />
      ))}
    </div>
  );
}
