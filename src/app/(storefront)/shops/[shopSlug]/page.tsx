import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Store } from "lucide-react";
import { OfferCard } from "@/components/storefront/offer-card";
import { SectionHeading } from "@/components/storefront/section-heading";
import { getSellerBySlug } from "@/lib/storefront";

type Props = { params: Promise<{ shopSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shopSlug } = await params;
  const { seller } = await getSellerBySlug(shopSlug);
  return {
    title: `${seller.shopName} | GameTrade`,
    description: seller.description || `Browse active offers from ${seller.shopName}.`,
  };
}

export default async function SellerShopPage({ params }: Props) {
  const { shopSlug } = await params;
  const { seller, offers } = await getSellerBySlug(shopSlug);

  return (
    <main className="mx-auto min-h-[65vh] max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#15243a] to-[#111827] p-7 sm:p-10">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-200"><Store className="h-7 w-7" /></span>
        <h1 className="mt-5 flex flex-wrap items-center gap-2 font-display text-4xl font-semibold text-white">
          {seller.shopName}
          {seller.verifiedAt && <BadgeCheck aria-label="Verified seller" className="h-6 w-6 text-cyan-300" />}
        </h1>
        {seller.description && <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{seller.description}</p>}
        <p className="mt-4 text-xs text-slate-500">Seller since {seller.createdAt.toLocaleDateString("en", { month: "long", year: "numeric" })}</p>
      </div>
      <section className="mt-10">
        <SectionHeading eyebrow="Shop inventory" title="Active offers" />
        {offers.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {offers.map((offer, index) => <OfferCard key={offer.id} offer={offer} index={index} />)}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-white/15 p-6 text-sm text-slate-400">
            This seller has no active offers right now. <Link href="/games" className="text-cyan-200 hover:text-white">Explore games.</Link>
          </p>
        )}
      </section>
    </main>
  );
}
