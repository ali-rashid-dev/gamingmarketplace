"use client";

import { Heart } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addWishlistItem } from "../actions";

export function WishlistButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, startTransition] = useTransition();
  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setMessage("");
          startTransition(async () => {
            try {
              const result = await addWishlistItem(listingId);
              if (!result.success) throw new Error(result.error);
              setMessage("Saved to wishlist");
              router.refresh();
            } catch (caught) {
              setMessage(caught instanceof Error ? caught.message : "Unable to save offer");
            }
          });
        }}
        className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground transition hover:border-gold/40"
      >
        <Heart aria-hidden="true" className="h-4 w-4 text-gold" />
        {busy ? "Saving…" : "Save to wishlist"}
      </button>
      {message && <p role="status" className="mt-2 text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}
