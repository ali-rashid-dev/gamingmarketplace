import type { Metadata } from "next";
import Link from "next/link";
import { OfferCard } from "@/components/storefront/offer-card";
import { OfferSearchFiltersForm } from "@/components/storefront/offer-search-filters";
import { OfferPagination } from "@/components/storefront/offer-pagination";
import { SectionHeading } from "@/components/storefront/section-heading";
import { getCategoryBySlugs } from "@/lib/storefront";
import {
  buildOfferSearchHref,
  getOfferSearchOptions,
  parseOfferSearchFilters,
  searchOffers,
  type SearchParams,
} from "@/lib/storefront-search";

type Props = {
  params: Promise<{ gameSlug: string; categorySlug: string }>;
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { gameSlug, categorySlug } = await params;
  const category = await getCategoryBySlugs(gameSlug, categorySlug);
  return {
    title: `${category.name} for ${category.game.name} | GameTrade`,
    description:
      category.description ||
      `Explore ${category.name.toLowerCase()} offers for ${category.game.name}.`,
  };
}

export default async function CategoryOffersPage({ params, searchParams }: Props) {
  const { gameSlug, categorySlug } = await params;
  const category = await getCategoryBySlugs(gameSlug, categorySlug);
  const query = await searchParams;
  const filters = parseOfferSearchFilters(query);
  const parsedPage = typeof query.page === "string" ? Number(query.page) : 1;
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0
    ? Math.min(parsedPage, 100_000)
    : 1;
  const pageSize = 48;
  const [results, options] = await Promise.all([
    searchOffers(filters, pageSize + 1, (page - 1) * pageSize, {
      gameId: category.gameId,
      categoryId: category.id,
    }),
    getOfferSearchOptions(),
  ]);
  const hasMore = results.length > pageSize;
  const offers = results.slice(0, pageSize);
  const needsCurrency =
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.sort === "price_asc" ||
    filters.sort === "price_desc";
  const hasFilters =
    filters.q ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.currency ||
    filters.platform ||
    filters.region ||
    filters.minRating !== undefined ||
    filters.verified ||
    filters.instant ||
    filters.minQuantity > 1;
  const paginationHref = buildOfferSearchHref(
    `/games/${category.game.slug}/${category.slug}`,
    filters,
    { gameId: category.gameId, categoryId: category.id }
  );

  return (
    <main className="mx-auto min-h-[65vh] max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-slate-500">
        <Link href="/games" className="hover:text-cyan-200">Games</Link>
        <span className="mx-2">/</span>
        <Link href={`/games/${category.game.slug}`} className="hover:text-cyan-200">{category.game.name}</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-300">{category.name}</span>
      </nav>
      <SectionHeading
        eyebrow={`${category.game.name} · ${category.type}`}
        title={category.name}
        description={category.description || `Browse available ${category.name.toLowerCase()} offers for ${category.game.name}.`}
      />
      {category.platforms.length > 0 && (
        <p className="mb-6 text-xs text-slate-400">
          Supported platforms: {category.platforms.join(", ")}
        </p>
      )}
      <OfferSearchFiltersForm
        action={`/games/${category.game.slug}/${category.slug}`}
        options={options}
        filters={filters}
        params={query}
        fixedGameId={category.gameId}
        fixedCategoryId={category.id}
      />
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
                : "No offers in this category yet"}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {needsCurrency && !filters.currency
              ? "Select a currency before setting a price range or sorting by price."
              : hasFilters
                ? "Try a different search or remove filters to see available offers."
                : "New listings will appear here when sellers publish them."}
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
