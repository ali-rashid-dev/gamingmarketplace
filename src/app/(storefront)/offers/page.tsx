import type { Metadata } from "next";
import Link from "next/link";
import { OfferCard } from "@/components/storefront/offer-card";
import { SectionHeading } from "@/components/storefront/section-heading";
import { getOffers } from "@/lib/storefront";

export const metadata: Metadata = {
  title: "Game Offers | GameTrade",
  description: "Browse active game accounts, items, top-ups, and services.",
};

type Props = { searchParams: Promise<{ sort?: string | string[] }> };

export default async function OffersPage({ searchParams }: Props) {
  const query = await searchParams;
  const sort = query.sort === "popular" ? "popular" : "recent";
  const offers = await getOffers(sort, 48);

  return (
    <main className="mx-auto min-h-[65vh] max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
      <SectionHeading
        eyebrow={sort === "popular" ? "Community favorites" : "Fresh listings"}
        title={sort === "popular" ? "Popular offers" : "All offers"}
        description="Compare active marketplace listings from approved sellers."
      />
      <div className="mb-6 flex gap-2">
        <Link href="/offers?sort=popular" className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${sort === "popular" ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100" : "border-white/10 text-slate-400 hover:text-white"}`}>Popular</Link>
        <Link href="/offers?sort=recent" className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${sort === "recent" ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100" : "border-white/10 text-slate-400 hover:text-white"}`}>Recently listed</Link>
      </div>
      {offers.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {offers.map((offer, index) => <OfferCard key={offer.id} offer={offer} index={index} />)}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center">
          <h2 className="font-display text-2xl font-semibold text-white">No active offers yet</h2>
          <p className="mt-2 text-sm text-slate-400">Check back as sellers add listings to the catalog.</p>
        </div>
      )}
    </main>
  );
}
