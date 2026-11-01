import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Store } from "lucide-react";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { absoluteUrl } from "@/lib/site-url";
import { OfferCard } from "@/components/storefront/offer-card";
import { SectionHeading } from "@/components/storefront/section-heading";
import { ReportReviewButton } from "@/app/dashboard/reviews/report-review-button";
import { getSellerBySlug } from "@/lib/storefront";

type Props = { params: Promise<{ shopSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shopSlug } = await params;
  const { seller, offers } = await getSellerBySlug(shopSlug);
  const description = seller.description || `Browse active offers from ${seller.shopName}.`;
  return {
    title: `${seller.shopName} | GameTrade`,
    description,
    alternates: { canonical: `/shops/${seller.slug}` },
    robots: offers.length ? undefined : { index: false, follow: true },
    openGraph: {
      title: `${seller.shopName} | GameTrade`,
      description,
      url: `/shops/${seller.slug}`,
      images: ["/opengraph-image"],
    },
  };
}

export default async function SellerShopPage({ params }: Props) {
  const { shopSlug } = await params;
  const { seller, offers, reviewSummary } = await getSellerBySlug(shopSlug);

  return (
    <main className="mx-auto min-h-[65vh] max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
      <BreadcrumbJsonLd items={[
        { name: "Home", path: absoluteUrl("/") },
        { name: "Marketplace", path: absoluteUrl("/offers") },
        { name: seller.shopName },
      ]} />
      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-slate-500">
        <Link href="/" className="hover:text-cyan-200">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/offers" className="hover:text-cyan-200">Marketplace</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-300">{seller.shopName}</span>
      </nav>
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#15243a] to-[#111827] p-7 sm:p-10">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-200"><Store className="h-7 w-7" /></span>
        <h1 className="mt-5 flex flex-wrap items-center gap-2 font-display text-4xl font-semibold text-white">
          {seller.shopName}
          {seller.verifiedAt && <BadgeCheck aria-label="Verified seller" className="h-6 w-6 text-cyan-300" />}
        </h1>
        {seller.description && <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{seller.description}</p>}
        <p className="mt-4 text-xs text-slate-500">Seller since {seller.createdAt.toLocaleDateString("en", { month: "long", year: "numeric" })}</p>
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="font-semibold text-white">
            {reviewSummary.average?.toFixed(1) ?? "No rating yet"} / 5
          </span>
          <span className="text-slate-400">
            {reviewSummary.count} verified review{reviewSummary.count === 1 ? "" : "s"}
          </span>
        </div>
      </div>
      <section className="mt-10">
        <SectionHeading eyebrow="Buyer feedback" title="Verified reviews" />
        {seller.reviews.length ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {seller.reviews.map((review) => (
              <article key={review.id} className="rounded-2xl border border-white/[0.09] bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-white">{review.rating} / 5</p>
                  <time className="text-xs text-slate-500">
                    {review.createdAt.toLocaleDateString("en", { dateStyle: "medium", timeZone: "UTC" })}
                  </time>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {review.buyer.name} · Verified purchase
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                  {review.comment || "No written feedback."}
                </p>
                {review.sellerResponse && (
                  <div className="mt-4 rounded-lg bg-white/[0.04] p-3">
                    <p className="text-xs font-semibold text-cyan-100">Seller response</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">{review.sellerResponse}</p>
                  </div>
                )}
                <ReportReviewButton reviewId={review.id} />
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-xl border border-dashed border-white/15 p-6 text-sm text-slate-400">
            This seller has no verified reviews yet.
          </p>
        )}
      </section>
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
