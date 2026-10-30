"use client";

import { useState, useTransition } from "react";
import { reviewListing } from "./actions";

type ReviewListing = {
  id: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  quantity: number;
  platform: string | null;
  region: string | null;
  deliveryType: string;
  deliveryEstimate: string | null;
  expiresAt: Date | null;
  images: string[];
  createdAt: Date;
  game: { name: string };
  category: { name: string; type: string };
  seller: { shopName: string };
  attributes: { id: string; label: string; value: unknown }[];
};

function ReviewCard({ listing }: { listing: ReviewListing }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();
  function decide(decision: "approve" | "return") {
    setError("");
    startTransition(async () => {
      try {
        const result = await reviewListing(listing.id, decision, note);
        if (!result.success) throw new Error(result.error);
        window.location.reload();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to review listing");
      }
    });
  }
  return (
    <article className="rounded-2xl border border-white/[0.09] bg-[#111a2b] p-5">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <p className="text-xs text-cyan-300">{listing.game.name} · {listing.category.name} ({listing.category.type})</p>
          <h2 className="mt-1 text-lg font-semibold text-white">{listing.title}</h2>
          <p className="mt-1 text-xs text-slate-400">Seller: {listing.seller.shopName} · Submitted {new Date(listing.createdAt).toLocaleString()}</p>
        </div>
        <p className="text-lg font-semibold text-white">{listing.currency} {listing.price}</p>
      </div>
      {listing.images.length > 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto">
          {listing.images.map((image, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={image} src={image} alt={`Listing image ${index + 1}`} className="h-28 w-40 rounded-lg object-cover" />
          ))}
        </div>
      )}
      <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-300">{listing.description}</p>
      <div className="mt-4 grid gap-2 text-xs text-slate-400 sm:grid-cols-3">
        <p>Quantity: {listing.quantity}</p>
        <p>Platform: {listing.platform || "Not specified"}</p>
        <p>Region: {listing.region || "Not specified"}</p>
        <p>Delivery: {listing.deliveryType.toLowerCase()} {listing.deliveryEstimate && `· ${listing.deliveryEstimate}`}</p>
        <p>Expires: {listing.expiresAt ? new Date(listing.expiresAt).toLocaleDateString() : "Never"}</p>
      </div>
      {listing.attributes.length > 0 && (
        <dl className="mt-4 grid gap-2 sm:grid-cols-2">
          {listing.attributes.map((attribute) => (
            <div key={attribute.id} className="rounded-lg bg-white/[0.03] px-3 py-2 text-xs">
              <dt className="text-slate-500">{attribute.label}</dt>
              <dd className="mt-1 break-words text-slate-200">{typeof attribute.value === "string" ? attribute.value : JSON.stringify(attribute.value)}</dd>
            </div>
          ))}
        </dl>
      )}
      <label className="mt-5 block text-xs text-slate-300">
        Review note (required when returning)
        <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} rows={2} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white" />
      </label>
      {error && <p role="alert" className="mt-3 text-xs text-rose-300">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button disabled={busy} onClick={() => decide("approve")} className="rounded-lg bg-emerald-300 px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-50">Approve and publish</button>
        <button disabled={busy} onClick={() => decide("return")} className="rounded-lg border border-amber-300/30 px-4 py-2 text-xs font-semibold text-amber-100 disabled:opacity-50">Return to seller</button>
      </div>
    </article>
  );
}

export function ListingReviewQueue({ listings }: { listings: ReviewListing[] }) {
  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Moderation</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-white">Listing review</h1>
      <p className="mt-2 text-sm text-slate-400">Offers stay hidden from buyers until approved.</p>
      {listings.length ? (
        <div className="mt-7 space-y-4">{listings.map((listing) => <ReviewCard key={listing.id} listing={listing} />)}</div>
      ) : (
        <div className="mt-7 rounded-2xl border border-dashed border-white/15 px-6 py-14 text-center text-sm text-slate-400">No listings are waiting for review.</div>
      )}
    </main>
  );
}
