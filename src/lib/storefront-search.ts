import { GameStatus, ListingStatus, SellerStatus } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { getOffers, type StorefrontOffer } from "@/lib/storefront";

export type OfferSort = "relevance" | "newest" | "price_asc" | "price_desc" | "popular";
const supportedCurrencies = new Set(["USD", "EUR", "GBP", "CAD", "AUD"]);

export type OfferSearchFilters = {
  q: string;
  gameId: string;
  categoryId: string;
  minPrice: number | undefined;
  maxPrice: number | undefined;
  currency: string;
  platform: string;
  region: string;
  minRating: number | undefined;
  verified: boolean;
  instant: boolean;
  minQuantity: number;
  sort: OfferSort;
};

export type SearchParams = Record<string, string | string[] | undefined>;

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

function boundedNumber(value: string, minimum: number, maximum: number) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : undefined;
}

export function parseOfferSearchFilters(params: SearchParams): OfferSearchFilters {
  const rawSort = firstString(params.sort);
  let sort: OfferSort = "relevance";
  if (rawSort === "recent" || rawSort === "newest") sort = "newest";
  else if (rawSort === "price_asc" || rawSort === "price_desc" || rawSort === "popular") {
    sort = rawSort;
  }
  const rawQuantity = Number(firstString(params.minQuantity));
  const minQuantity = [1, 5, 10].includes(rawQuantity) ? rawQuantity : 1;
  const rawRating = boundedNumber(firstString(params.minRating), 1, 5);
  const rawSearch = firstString(params.q).trim().slice(0, 100);

  return {
    q: rawSearch,
    gameId: firstString(params.gameId).slice(0, 128),
    categoryId: firstString(params.categoryId).slice(0, 128),
    minPrice: boundedNumber(firstString(params.minPrice), 0, 9_999_999_999),
    maxPrice: boundedNumber(firstString(params.maxPrice), 0, 9_999_999_999),
    currency: supportedCurrencies.has(firstString(params.currency))
      ? firstString(params.currency)
      : "",
    platform: firstString(params.platform).trim().slice(0, 80),
    region: firstString(params.region).trim().slice(0, 80),
    minRating: rawRating === 4 || rawRating === 4.5 ? rawRating : undefined,
    verified: firstString(params.verified) === "1",
    instant: firstString(params.instant) === "1",
    minQuantity,
    sort,
  };
}

export function buildOfferSearchHref(
  pathname: string,
  filters: OfferSearchFilters,
  fixed: { gameId?: string; categoryId?: string } = {}
) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.gameId && !fixed.gameId) params.set("gameId", filters.gameId);
  if (filters.categoryId && !fixed.categoryId) {
    params.set("categoryId", filters.categoryId);
  }
  if (filters.minPrice !== undefined) params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set("maxPrice", String(filters.maxPrice));
  if (filters.currency) params.set("currency", filters.currency);
  if (filters.platform) params.set("platform", filters.platform);
  if (filters.region) params.set("region", filters.region);
  if (filters.minRating) params.set("minRating", String(filters.minRating));
  if (filters.verified) params.set("verified", "1");
  if (filters.instant) params.set("instant", "1");
  if (filters.minQuantity > 1) params.set("minQuantity", String(filters.minQuantity));
  if (filters.sort !== "relevance") params.set("sort", filters.sort);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function buildOfferSearchWhere(
  filters: OfferSearchFilters,
  additionalWhere: Prisma.ListingWhereInput = {}
): Prisma.ListingWhereInput {
  const conditions: Prisma.ListingWhereInput[] = [additionalWhere];
  if (filters.gameId) conditions.push({ gameId: filters.gameId });
  if (filters.categoryId) conditions.push({ categoryId: filters.categoryId });
  if (filters.minPrice !== undefined) conditions.push({ price: { gte: filters.minPrice } });
  if (filters.maxPrice !== undefined) conditions.push({ price: { lte: filters.maxPrice } });
  if (filters.currency) conditions.push({ currency: filters.currency });
  if (filters.platform) {
    conditions.push({ platform: { equals: filters.platform, mode: "insensitive" } });
  }
  if (filters.region) {
    conditions.push({ region: { equals: filters.region, mode: "insensitive" } });
  }
  if (filters.instant) conditions.push({ deliveryType: "INSTANT" });
  if (filters.minQuantity > 1) conditions.push({ quantity: { gte: filters.minQuantity } });
  if (filters.verified) conditions.push({ seller: { verifiedAt: { not: null } } });
  if (filters.minRating) {
    conditions.push({
      seller: {
        reviews: {
          some: { rating: { gte: filters.minRating } },
        },
      },
    });
  }
  return { AND: conditions };
}

export async function searchOffers(
  filters: OfferSearchFilters,
  take: number,
  skip: number,
  additionalWhere: Prisma.ListingWhereInput = {}
): Promise<StorefrontOffer[]> {
  const needsCurrency =
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.sort === "price_asc" ||
    filters.sort === "price_desc";
  if (needsCurrency && !filters.currency) return [];

  if (!filters.q && !filters.minRating && filters.sort !== "price_asc" && filters.sort !== "price_desc") {
    return getOffers(
      filters.sort === "popular" ? "popular" : "recent",
      take,
      buildOfferSearchWhere(filters, additionalWhere),
      skip
    );
  }

  const conditions: Prisma.Sql[] = [
    Prisma.sql`l."status" = 'ACTIVE'`,
    Prisma.sql`l."publishedAt" IS NOT NULL`,
    Prisma.sql`l."quantity" >= ${filters.minQuantity}`,
    Prisma.sql`(l."expiresAt" IS NULL OR l."expiresAt" > CURRENT_TIMESTAMP)`,
    Prisma.sql`g."status" = 'PUBLISHED'`,
    Prisma.sql`c."isActive" = TRUE`,
    Prisma.sql`s."status" = 'APPROVED'`,
  ];

  if (filters.q) {
    conditions.push(Prisma.sql`(
      l."searchVector" @@ search_query.tsquery OR
      to_tsvector('simple', concat_ws(' ', g."name", c."name")) @@ search_query.tsquery
    )`);
  }
  if (filters.gameId) conditions.push(Prisma.sql`l."gameId" = ${filters.gameId}`);
  if (filters.categoryId) conditions.push(Prisma.sql`l."categoryId" = ${filters.categoryId}`);
  if (filters.minPrice !== undefined) conditions.push(Prisma.sql`l."price" >= ${filters.minPrice}`);
  if (filters.maxPrice !== undefined) conditions.push(Prisma.sql`l."price" <= ${filters.maxPrice}`);
  if (filters.currency) conditions.push(Prisma.sql`l."currency" = ${filters.currency}`);
  if (filters.platform) {
    conditions.push(Prisma.sql`lower(l."platform") = lower(${filters.platform})`);
  }
  if (filters.region) {
    conditions.push(Prisma.sql`lower(l."region") = lower(${filters.region})`);
  }
  if (filters.instant) conditions.push(Prisma.sql`l."deliveryType" = 'INSTANT'`);
  if (filters.verified) conditions.push(Prisma.sql`s."verifiedAt" IS NOT NULL`);
  if (filters.minRating) {
    conditions.push(Prisma.sql`EXISTS (
      SELECT 1
      FROM "Review" r
      WHERE r."sellerId" = s."id"
      GROUP BY r."sellerId"
      HAVING AVG(r."rating") >= ${filters.minRating}
    )`);
  }
  if (additionalWhere.gameId && typeof additionalWhere.gameId === "string") {
    conditions.push(Prisma.sql`l."gameId" = ${additionalWhere.gameId}`);
  }
  if (additionalWhere.categoryId && typeof additionalWhere.categoryId === "string") {
    conditions.push(Prisma.sql`l."categoryId" = ${additionalWhere.categoryId}`);
  }

  const orderBy =
    filters.sort === "popular"
      ? Prisma.sql`(SELECT COUNT(*) FROM "OrderItem" oi WHERE oi."listingId" = l."id") DESC, l."publishedAt" DESC, l."id" DESC`
      : filters.sort === "price_asc"
        ? Prisma.sql`l."price" ASC, l."publishedAt" DESC, l."id" DESC`
        : filters.sort === "price_desc"
          ? Prisma.sql`l."price" DESC, l."publishedAt" DESC, l."id" DESC`
          : filters.sort === "newest" || !filters.q
            ? Prisma.sql`l."publishedAt" DESC, l."createdAt" DESC, l."id" DESC`
            : Prisma.sql`(
                ts_rank_cd(l."searchVector", search_query.tsquery) +
                ts_rank_cd(to_tsvector('simple', concat_ws(' ', g."name", c."name")), search_query.tsquery)
              ) DESC, l."publishedAt" DESC, l."id" DESC`;

  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    WITH search_query AS (
      SELECT websearch_to_tsquery('simple', ${filters.q}) AS tsquery
    )
    SELECT l."id"
    FROM "Listing" l
    INNER JOIN "Game" g ON g."id" = l."gameId"
    INNER JOIN "Category" c ON c."id" = l."categoryId" AND c."gameId" = l."gameId"
    INNER JOIN "SellerProfile" s ON s."id" = l."sellerId"
    CROSS JOIN search_query
    WHERE ${Prisma.join(conditions, " AND ")}
    ORDER BY ${orderBy}
    LIMIT ${take}
    OFFSET ${skip}
  `);
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);
  const offers = await getOffers(
    "recent",
    ids.length,
    { id: { in: ids } },
    0
  );
  const offersById = new Map(offers.map((offer) => [offer.id, offer]));
  return ids.flatMap((id) => {
    const offer = offersById.get(id);
    return offer ? [offer] : [];
  });
}

export async function getOfferSearchOptions() {
  const availableListingWhere = {
    status: ListingStatus.ACTIVE,
    publishedAt: { not: null },
    quantity: { gt: 0 },
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    game: { status: GameStatus.PUBLISHED },
    category: { isActive: true },
    seller: { status: SellerStatus.APPROVED },
  } satisfies Prisma.ListingWhereInput;
  const [games, regions, listingPlatforms] = await Promise.all([
    prisma.game.findMany({
      where: {
        status: GameStatus.PUBLISHED,
        categories: { some: { isActive: true } },
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        categories: {
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true, platforms: true },
        },
      },
    }),
    prisma.listing.findMany({
      where: { ...availableListingWhere, region: { not: null } },
      distinct: ["region"],
      orderBy: { region: "asc" },
      take: 100,
      select: { region: true },
    }),
    prisma.listing.findMany({
      where: { ...availableListingWhere, platform: { not: null } },
      distinct: ["platform"],
      orderBy: { platform: "asc" },
      take: 100,
      select: { platform: true },
    }),
  ]);
  const platforms = Array.from(
    new Set([
      ...games.flatMap((game) =>
        game.categories.flatMap((category) => category.platforms)
      ),
      ...listingPlatforms.flatMap((record) => (record.platform ? [record.platform] : [])),
    ])
  ).sort((left, right) => left.localeCompare(right));
  return {
    games,
    categories: games.flatMap((game) =>
      game.categories.map((category) => ({
        id: category.id,
        gameId: game.id,
        gameName: game.name,
        name: category.name,
      }))
    ),
    platforms,
    regions: regions.flatMap((record) => (record.region ? [record.region] : [])),
  };
}

export async function getOfferSearchSuggestions(queryInput: string) {
  const query = queryInput.trim().slice(0, 80);
  if (query.length < 2) return [];

  const results = await prisma.$queryRaw<{ suggestion: string }[]>(Prisma.sql`
    SELECT suggestion
    FROM (
      SELECT DISTINCT candidate AS suggestion
      FROM (
        SELECT l."title" AS candidate
        FROM "Listing" l
        INNER JOIN "Game" g ON g."id" = l."gameId"
        INNER JOIN "Category" c ON c."id" = l."categoryId" AND c."gameId" = l."gameId"
        INNER JOIN "SellerProfile" s ON s."id" = l."sellerId"
        WHERE l."status" = 'ACTIVE' AND l."publishedAt" IS NOT NULL
          AND l."quantity" > 0 AND (l."expiresAt" IS NULL OR l."expiresAt" > CURRENT_TIMESTAMP)
          AND g."status" = 'PUBLISHED' AND c."isActive" = TRUE AND s."status" = 'APPROVED'
          AND (position(lower(${query}) in lower(l."title")) > 0 OR l."searchVector" @@ websearch_to_tsquery('simple', ${query}))
        UNION ALL
        SELECT g."name" AS candidate
        FROM "Game" g
        WHERE g."status" = 'PUBLISHED' AND position(lower(${query}) in lower(g."name")) > 0
          AND EXISTS (
            SELECT 1 FROM "Listing" l
            INNER JOIN "Category" c ON c."id" = l."categoryId" AND c."gameId" = l."gameId"
            INNER JOIN "SellerProfile" s ON s."id" = l."sellerId"
            WHERE l."gameId" = g."id" AND l."status" = 'ACTIVE' AND l."publishedAt" IS NOT NULL
              AND l."quantity" > 0 AND (l."expiresAt" IS NULL OR l."expiresAt" > CURRENT_TIMESTAMP)
              AND c."isActive" = TRUE AND s."status" = 'APPROVED'
          )
        UNION ALL
        SELECT c."name" AS candidate
        FROM "Category" c
        INNER JOIN "Game" g ON g."id" = c."gameId"
        WHERE c."isActive" = TRUE AND g."status" = 'PUBLISHED' AND position(lower(${query}) in lower(c."name")) > 0
          AND EXISTS (
            SELECT 1 FROM "Listing" l
            INNER JOIN "SellerProfile" s ON s."id" = l."sellerId"
            WHERE l."categoryId" = c."id" AND l."gameId" = c."gameId"
              AND l."status" = 'ACTIVE' AND l."publishedAt" IS NOT NULL
              AND l."quantity" > 0 AND (l."expiresAt" IS NULL OR l."expiresAt" > CURRENT_TIMESTAMP)
              AND s."status" = 'APPROVED'
          )
      ) candidates
      WHERE candidate <> ''
      LIMIT 30
    ) suggestions
    ORDER BY suggestion
    LIMIT 8
  `);
  return results.map((result) => result.suggestion);
}
