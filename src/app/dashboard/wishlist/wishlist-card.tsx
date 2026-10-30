"use client";

import Link from "next/link";
import { HeartOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { removeWishlistItem } from "../actions";

export function WishlistCard({
  item,
  available,
}: {
  item: {
    id: string;
    listing: {
      id: string;
      title: string;
      price: string;
      currency: string;
      game: { name: string };
      category: { name: string };
    };
  };
  available: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();
  function remove() {
    setError("");
    startTransition(async () => {
      try {
        const result = await removeWishlistItem(item.id);
        if (!result.success) throw new Error(result.error);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to remove offer");
      }
    });
  }
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{item.listing.game.name} · {item.listing.category.name}</p>
          <h2 className="mt-1 break-words font-semibold">{item.listing.title}</h2>
        </div>
        <p className="max-w-[40%] shrink-0 text-right text-sm font-semibold">
          {new Intl.NumberFormat("en", { style: "currency", currency: item.listing.currency }).format(Number(item.listing.price))}
        </p>
      </div>
      {!available && <p className="mt-3 inline-flex rounded-full border border-destructive/20 bg-destructive/10 px-2.5 py-1 text-[11px] font-medium text-destructive">Unavailable or expired</p>}
    </>
  );
  return (
    <article className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
      {available ? <Link href={`/offers/${item.listing.id}`} className="block hover:text-gold">{content}</Link> : <div className="opacity-75">{content}</div>}
      {error && <p role="alert" className="mt-3 text-xs text-destructive">{error}</p>}
      <button type="button" onClick={remove} disabled={busy} className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-destructive disabled:opacity-50">
        <HeartOff className="h-3.5 w-3.5" />
        {busy ? "Removing…" : "Remove"}
      </button>
    </article>
  );
}
