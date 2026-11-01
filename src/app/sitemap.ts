import type { MetadataRoute } from "next";
import { GameStatus, SellerStatus } from "@/generated/prisma/enums";
import { absoluteUrl } from "@/lib/site-url";
import { publicListingWhere } from "@/lib/storefront";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const visibleListings = publicListingWhere();
  const [games, categories, sellers, offers] = await Promise.all([
    prisma.game.findMany({
      where: {
        status: GameStatus.PUBLISHED,
        listings: { some: visibleListings },
      },
      select: { slug: true },
      orderBy: { slug: "asc" },
    }),
    prisma.category.findMany({
      where: {
        isActive: true,
        game: { status: GameStatus.PUBLISHED },
        listings: { some: visibleListings },
      },
      select: { slug: true, game: { select: { slug: true } } },
      orderBy: [{ game: { slug: "asc" } }, { slug: "asc" }],
    }),
    prisma.sellerProfile.findMany({
      where: {
        status: SellerStatus.APPROVED,
        isAvailable: true,
        listings: { some: visibleListings },
      },
      select: { slug: true },
      orderBy: { slug: "asc" },
    }),
    prisma.listing.findMany({
      where: visibleListings,
      select: { id: true, updatedAt: true },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    }),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/games"), changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/offers"), changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl("/help"), changeFrequency: "monthly", priority: 0.4 },
    { url: absoluteUrl("/policies"), changeFrequency: "monthly", priority: 0.3 },
    { url: absoluteUrl("/contact"), changeFrequency: "monthly", priority: 0.3 },
    { url: absoluteUrl("/sell"), changeFrequency: "monthly", priority: 0.5 },
  ];

  return [
    ...staticPages,
    ...games.map((game) => ({
      url: absoluteUrl(`/games/${game.slug}`),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...categories.map((category) => ({
      url: absoluteUrl(`/games/${category.game.slug}/${category.slug}`),
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...sellers.map((seller) => ({
      url: absoluteUrl(`/shops/${seller.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...offers.map((offer) => ({
      url: absoluteUrl(`/offers/${offer.id}`),
      lastModified: offer.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
  ];
}
