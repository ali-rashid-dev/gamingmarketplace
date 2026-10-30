import type { Metadata } from "next";
import { OfferCard } from "@/components/storefront/offer-card";
import { OfferSearchFiltersForm } from "@/components/storefront/offer-search-filters";
import { OfferPagination } from "@/components/storefront/offer-pagination";
import { SectionHeading } from "@/components/storefront/section-heading";
import {
  buildOfferSearchHref,
  getOfferSearchOptions,
  parseOfferSearchFilters,
  searchOffers,
  type SearchParams,
} from "@/lib/storefront-search";

export const metadata: Metadata = {
  title: "Game Offers | GameTrade",
  description: "Browse active game accounts, items, top-ups, and services.",
};

type Props = { searchParams: Promise<SearchParams> };

export default async function OffersPage({ searchParams }: Props) {
  const query = await searchParams;
  const filters = parseOfferSearchFilters(query);
  const parsedPage = typeof query.page === "string" ? Number(query.page) : 1;
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0
    ? Math.min(parsedPage, 100_000)
    : 1;
  const pageSize = 48;
  const [results, options] = await Promise.all([
    searchOffers(filters, pageSize + 1, (page - 1) * pageSize),
    getOfferSearchOptions(),
  ]);
  const hasMore = results.length > pageSize;
  const offers = results.slice(0, pageSize);
  const paginationHref = buildOfferSearchHref("/offers", filters);
  const needsCurrency =
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.sort === "price_asc" ||
    filters.sort === "price_desc";
  const hasFilters =
    filters.q ||
    filters.gameId ||
    filters.categoryId ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.currency ||
    filters.platform ||
    filters.region ||
    filters.minRating !== undefined ||
    filters.verified ||
    filters.instant ||
    filters.minQuantity > 1;

  return (
    <main className="mx-auto min-h-[65vh] max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
      <SectionHeading
        eyebrow={filters.q ? "Search results" : "Marketplace"}
        title={filters.q ? `Offers matching “${filters.q}”` : "Find your next offer"}
        description="Search and filter live listings from approved sellers."
      />
      <OfferSearchFiltersForm options={options} filters={filters} params={query} />
      {offers.length > 0 && (
        <p className="mb-4 text-xs text-slate-500">
          Showing {offers.length} offer{offers.length === 1 ? "" : "s"} · sorted by {filters.sort.replace("_", " ")}
        </p>
      )}
      {offers.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {offers.map((offer, index) => <OfferCard key={offer.id} offer={offer} index={index} />)}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center">
          <h2 className="font-display text-2xl font-semibold text-white">
            {needsCurrency && !filters.currency
              ? "Choose a currency for price filters"
              : hasFilters
                ? "No offers match these filters"
                : "No active offers yet"}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {needsCurrency && !filters.currency
              ? "Select a currency before setting a price range or sorting by price."
              : hasFilters
                ? "Try a different search or remove some filters to see more available offers."
                : "Check back as sellers add listings to the catalog."}
          </p>
        </div>
      )}
      {offers.length > 0 && (
        <OfferPagination
          href={paginationHref}
          page={page}
          hasMore={hasMore}
        />
      )}
    </main>
  );
}
