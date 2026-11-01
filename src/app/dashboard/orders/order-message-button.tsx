"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { startBuyerOrderConversation } from "../actions";

export function OrderMessageButton({
  orderId,
  sellerUserId,
}: {
  orderId: string;
  sellerUserId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();

  function openConversation() {
    setError("");
    startTransition(async () => {
      try {
        const result = await startBuyerOrderConversation(orderId, sellerUserId);
        if (!result.success) throw new Error(result.error);
        router.push(`/dashboard/messages#conversation-${encodeURIComponent(result.data.conversationId)}`);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to open seller conversation");
      }
    });
  }

  return (
    <div className="mt-3">
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={openConversation}>
        {busy ? "Opening…" : "Message seller about this order"}
      </Button>
      {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}
