"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteSellerListing, setSellerListingStatus, updateSellerListingAvailability } from "./actions";

type Listing = {
  id: string;
  title: string;
  price: string;
  currency: string;
  quantity: number;
  status: string;
  expiresAt: Date | null;
  reviewNote: string | null;
  updatedAt: Date;
  game: { name: string };
  category: { name: string };
  expired: boolean;
};

const statusNames: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending review",
  ACTIVE: "Active",
  PAUSED: "Paused",
  SOLD_OUT: "Sold",
};

function ListingRow({ listing }: { listing: Listing }) {
  const [price, setPrice] = useState(listing.price);
  const [quantity, setQuantity] = useState(String(listing.quantity));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, startTransition] = useTransition();
  const canEdit = ["DRAFT", "PENDING_REVIEW", "ACTIVE", "PAUSED"].includes(listing.status);
  const expired = listing.expired;

  function run(action: () => Promise<{ success: boolean; error?: string }>, success: string) {
    setError("");
    setNotice("");
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.success) throw new Error(result.error ?? "Unable to update listing");
        setNotice(success);
        window.location.reload();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to update listing");
      }
    });
  }

  return (
    <article className="rounded-2xl border border-white/[0.09] bg-[#111a2b] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-cyan-300">{listing.game.name} · {listing.category.name}</p>
          <h2 className="mt-1 font-semibold text-white">{listing.title}</h2>
          <p className="mt-2 text-xs text-slate-400">
            Status: <span className={expired ? "text-amber-300" : "text-slate-200"}>
              {expired ? "Expired" : statusNames[listing.status] ?? listing.status}
            </span>
            {listing.expiresAt && ` · Expires ${new Date(listing.expiresAt).toLocaleDateString()}`}
          </p>
          {listing.reviewNote && (
            <p className="mt-2 rounded-lg border border-amber-300/20 bg-amber-300/[0.06] p-3 text-xs text-amber-100">
              Review note: {listing.reviewNote}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <Link href={`/seller/listings/${listing.id}`} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white hover:bg-white/[0.05]">
              Edit details
            </Link>
          )}
          {listing.status === "ACTIVE" && (
            <button disabled={busy} onClick={() => run(() => setSellerListingStatus(listing.id, "PAUSED"), "Listing paused")} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
              Pause
            </button>
          )}
          {listing.status === "PAUSED" && !expired && (
            <button disabled={busy} onClick={() => run(() => setSellerListingStatus(listing.id, "ACTIVE"), "Listing reactivated")} className="rounded-lg border border-cyan-300/30 px-3 py-2 text-xs font-semibold text-cyan-100 disabled:opacity-50">
              Reactivate
            </button>
          )}
          <button disabled={busy} onClick={() => {
            if (window.confirm("Delete this listing?")) {
              run(() => deleteSellerListing(listing.id), "Listing deleted");
            }
          }} className="rounded-lg border border-rose-300/20 px-3 py-2 text-xs font-semibold text-rose-200 disabled:opacity-50">
            Delete
          </button>
        </div>
      </div>
      {["ACTIVE", "PAUSED", "SOLD_OUT"].includes(listing.status) && (
        <div className="mt-5 grid gap-3 border-t border-white/[0.07] pt-4 sm:grid-cols-[1fr_1fr_auto]">
          <label className="text-xs text-slate-400">
            Price ({listing.currency})
            <input type="number" min="0.01" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white" />
          </label>
          <label className="text-xs text-slate-400">
            Available quantity
            <input type="number" min="0" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white" />
          </label>
          <button disabled={busy} onClick={() => run(
            () => updateSellerListingAvailability(listing.id, { price: Number(price), quantity: Number(quantity) }),
            "Price and availability updated"
          )} className="self-end rounded-lg bg-cyan-300 px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-50">
            Update offer
          </button>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-xs text-rose-300">{error}</p>}
      {notice && <p role="status" className="mt-3 text-xs text-cyan-200">{notice}</p>}
    </article>
  );
}

export function SellerListings({ listings }: { listings: Listing[] }) {
  if (listings.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-white/15 px-6 py-14 text-center">
        <h2 className="font-display text-xl font-semibold text-white">No listings yet</h2>
        <p className="mt-2 text-sm text-slate-400">Start with a draft, preview it, then submit it for review.</p>
      </div>
    );
  }
  return <div className="mt-8 space-y-4">{listings.map((listing) => <ListingRow key={listing.id} listing={listing} />)}</div>;
}
