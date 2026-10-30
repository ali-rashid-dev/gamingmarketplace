import { GameStatus, ListingStatus, SellerStatus } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";

export function publicListingWhere(): Prisma.ListingWhereInput {
  return {
    status: ListingStatus.ACTIVE,
    publishedAt: { not: null },
    quantity: { gt: 0 },
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    game: { status: GameStatus.PUBLISHED },
    category: { isActive: true },
    seller: { status: SellerStatus.APPROVED, isAvailable: true },
  };
}

const publicListingInclude = {
  game: { select: { name: true, slug: true, logoUrl: true } },
  category: { select: { name: true, slug: true, type: true } },
  seller: { select: { shopName: true, slug: true, verifiedAt: true } },
  _count: { select: { orderItems: true, reviews: true } },
} satisfies Prisma.ListingInclude;

export type StorefrontOffer = Prisma.ListingGetPayload<{
  include: typeof publicListingInclude;
}>;

export async function getFeaturedGames() {
  const visibleListings = publicListingWhere();
  return prisma.game.findMany({
    where: {
      status: GameStatus.PUBLISHED,
      categories: { some: { isActive: true } },
    },
    orderBy: { name: "asc" },
    take: 8,
    include: {
      categories: {
        where: { isActive: true },
        orderBy: { name: "asc" },
        take: 4,
        select: { id: true, name: true, slug: true },
      },
      _count: {
        select: {
          listings: { where: visibleListings },
        },
      },
    },
  });
}

export async function getOffers(
  sort: "popular" | "recent" = "recent",
  take = 8,
  where: Prisma.ListingWhereInput = {},
  skip = 0
): Promise<StorefrontOffer[]> {
  return prisma.listing.findMany({
    where: { AND: [publicListingWhere(), where] },
    include: publicListingInclude,
    orderBy:
      sort === "popular"
        ? [{ orderItems: { _count: "desc" } }, { publishedAt: "desc" }, { id: "desc" }]
        : [{ publishedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    take,
    skip,
  });
}

export async function getPublishedGames(search?: string) {
  const visibleListings = publicListingWhere();
  const query = search?.trim();
  return prisma.game.findMany({
    where: {
      status: GameStatus.PUBLISHED,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
              {
                categories: {
                  some: {
                    isActive: true,
                    name: { contains: query, mode: "insensitive" },
                  },
                },
              },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    include: {
      categories: {
        where: { isActive: true },
        orderBy: { name: "asc" },
        take: 6,
        select: { id: true, name: true, slug: true },
      },
      _count: {
        select: {
          listings: { where: visibleListings },
        },
      },
    },
  });
}

export async function getGameBySlug(slug: string) {
  const visibleListings = publicListingWhere();
  const game = await prisma.game.findFirst({
    where: { slug, status: GameStatus.PUBLISHED },
    include: {
      categories: {
        where: { isActive: true },
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: { listings: { where: visibleListings } },
          },
        },
      },
    },
  });
  if (!game) notFound();
  return game;
}

export async function getCategoryBySlugs(gameSlug: string, categorySlug: string) {
  const visibleListings = publicListingWhere();
  const category = await prisma.category.findFirst({
    where: {
      slug: categorySlug,
      isActive: true,
      game: { slug: gameSlug, status: GameStatus.PUBLISHED },
    },
    include: {
      game: { select: { name: true, slug: true, description: true } },
      _count: {
        select: { listings: { where: visibleListings } },
      },
    },
  });
  if (!category) notFound();
  return category;
}

export async function getOfferById(id: string) {
  const visibleListings = publicListingWhere();
  const offer = await prisma.listing.findFirst({
    where: { AND: [visibleListings, { id }] },
    include: {
      ...publicListingInclude,
      attributes: { orderBy: { key: "asc" } },
      seller: {
        select: {
          shopName: true,
          slug: true,
          description: true,
          verifiedAt: true,
          _count: {
            select: { listings: { where: visibleListings } },
          },
        },
      },
    },
  });
  if (!offer) notFound();
  return offer;
}

export async function getSellerBySlug(slug: string) {
  const seller = await prisma.sellerProfile.findFirst({
    where: { slug, status: SellerStatus.APPROVED, isAvailable: true },
    select: {
      id: true,
      shopName: true,
      slug: true,
      description: true,
      verifiedAt: true,
      createdAt: true,
    },
  });
  if (!seller) notFound();
  const offers = await getOffers("recent", 24, { sellerId: seller.id });
  return { seller, offers };
}

export function getOfferImage(images: Prisma.JsonValue): string | null {
  if (!Array.isArray(images)) return null;
  for (const image of images) {
    if (typeof image === "string" && image.startsWith("https://")) return image;
    if (
      image &&
      typeof image === "object" &&
      !Array.isArray(image) &&
      "url" in image &&
      typeof image.url === "string" &&
      image.url.startsWith("https://")
    ) {
      return image.url;
    }
  }
  return null;
}

export function formatPrice(price: Prisma.Decimal, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(price));
}
