"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { markBuyerNotificationRead } from "../actions";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: unknown;
  readAt: Date | null;
  createdAt: Date;
};

function notificationHref(data: unknown) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const record = data as Record<string, unknown>;
  if (typeof record.orderId === "string") return `/dashboard/orders/${encodeURIComponent(record.orderId)}`;
  if (typeof record.conversationId === "string") return "/dashboard/messages";
  if (typeof record.ticketId === "string") return "/dashboard/support";
  return null;
}

export function NotificationList({ notifications }: { notifications: Notification[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();
  async function markRead(id: string) {
    setError("");
    startTransition(async () => {
      try {
        const result = await markBuyerNotificationRead(id);
        if (!result.success) throw new Error(result.error);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to update notification");
      }
    });
  }
  if (!notifications.length) {
    return <p className="mt-6 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">You’re all caught up. New account and order updates will appear here.</p>;
  }
  return (
    <div className="mt-6 space-y-3">
      {notifications.map((notification) => {
        const href = notificationHref(notification.data);
        const content = (
          <>
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-semibold">{notification.title}</h2>
              {!notification.readAt && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gold" aria-label="Unread" />}
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{notification.body}</p>
            <time className="mt-3 block text-[11px] text-muted-foreground">{notification.createdAt.toLocaleString()}</time>
          </>
        );
        return (
          <article key={notification.id} className={`rounded-xl border bg-card p-5 ${notification.readAt ? "border-border" : "border-gold/30"}`}>
            {href ? <Link href={href} className="block hover:text-gold">{content}</Link> : content}
            {!notification.readAt && (
              <button type="button" disabled={busy} onClick={() => markRead(notification.id)} className="mt-3 text-xs font-semibold text-gold hover:underline disabled:opacity-50">
                Mark as read
              </button>
            )}
          </article>
        );
      })}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
