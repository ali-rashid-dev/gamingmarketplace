"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { confirmBuyerReceipt } from "../actions";

export function ConfirmReceiptButton({ orderItemId }: { orderItemId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();
  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setError("");
          startTransition(async () => {
            try {
              const result = await confirmBuyerReceipt(orderItemId);
              if (!result.success) throw new Error(result.error);
              router.refresh();
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : "Unable to confirm delivery");
            }
          });
        }}
        className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Confirming…" : "Confirm receipt"}
      </button>
      {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}
