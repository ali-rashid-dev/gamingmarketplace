import CatalogClient from "@/app/admin/catalog/catalog-client";
import prisma from "@/lib/prisma";

export default async function AdminCatalogPage() {
  const records = await prisma.game.findMany({
    orderBy: { name: "asc" },
    include: {
      categories: {
        orderBy: { name: "asc" },
        include: { fields: { orderBy: { sortOrder: "asc" } } },
      },
      _count: { select: { listings: true } },
    },
  });

  const games = records.map((game) => ({
    id: game.id,
    name: game.name,
    slug: game.slug,
    description: game.description,
    logoUrl: game.logoUrl,
    coverImageUrl: game.coverImageUrl,
    seoTitle: game.seoTitle,
    seoDescription: game.seoDescription,
    status: game.status,
    listingCount: game._count.listings,
    categories: game.categories.map((category) => ({
      id: category.id,
      gameId: category.gameId,
      name: category.name,
      slug: category.slug,
      type: category.type,
      description: category.description,
      platforms: category.platforms,
      isActive: category.isActive,
      fields: category.fields.map((field) => ({
        id: field.id,
        key: field.key,
        label: field.label,
        type: field.type,
        isRequired: field.isRequired,
        options: Array.isArray(field.options)
          ? field.options.filter((option): option is string => typeof option === "string")
          : [],
        sortOrder: field.sortOrder,
      })),
    })),
  }));

  return <CatalogClient initialGames={games} />;
}
