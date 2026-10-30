import { GameStatus, SellerStatus, UserRole } from "@/generated/prisma/enums";
import { notFound, redirect } from "next/navigation";
import { requirePageRoles } from "@/lib/authorization";
import prisma from "@/lib/prisma";

export async function requireApprovedSeller() {
  const session = await requirePageRoles([UserRole.SELLER]);
  const seller = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, status: true },
  });
  if (!seller || seller.status !== SellerStatus.APPROVED) redirect("/dashboard");
  return { userId: session.user.id, sellerId: seller.id };
}

export async function getListingCatalog() {
  await requireApprovedSeller();
  const games = await prisma.game.findMany({
    where: { status: GameStatus.PUBLISHED },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      categories: {
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          platforms: true,
          fields: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              key: true,
              label: true,
              type: true,
              isRequired: true,
              options: true,
            },
          },
        },
      },
    },
  });
  return games.map((game) => ({
    ...game,
    categories: game.categories.map((category) => ({
      ...category,
      fields: category.fields.map((field) => ({
        ...field,
        options: Array.isArray(field.options)
          ? field.options.filter((option): option is string => typeof option === "string")
          : [],
      })),
    })),
  }));
}

export async function getSellerListings() {
  const { sellerId } = await requireApprovedSeller();
  const listings = await prisma.listing.findMany({
    where: { sellerId, status: { not: "REMOVED" } },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      title: true,
      price: true,
      currency: true,
      quantity: true,
      status: true,
      expiresAt: true,
      reviewNote: true,
      updatedAt: true,
      game: { select: { name: true } },
      category: { select: { name: true } },
    },
  });
  return listings.map((listing) => ({
    ...listing,
    price: listing.price.toString(),
    expired: listing.expiresAt !== null && listing.expiresAt <= new Date(),
  }));
}

export async function getSellerListingForEdit(listingId: string) {
  const { sellerId } = await requireApprovedSeller();
  const listing = await prisma.listing.findFirst({
    where: {
      id: listingId,
      sellerId,
      status: { notIn: ["REMOVED", "SOLD_OUT"] },
    },
    include: {
      attributes: { orderBy: { key: "asc" } },
      revisions: {
        orderBy: { revisionNumber: "desc" },
        take: 10,
        select: {
          id: true,
          revisionNumber: true,
          createdAt: true,
          changedBy: { select: { name: true } },
        },
      },
    },
  });
  if (!listing) notFound();

  return {
    id: listing.id,
    gameId: listing.gameId,
    categoryId: listing.categoryId,
    title: listing.title,
    description: listing.description,
    price: listing.price.toString(),
    currency: listing.currency,
    quantity: listing.quantity,
    platform: listing.platform ?? "",
    region: listing.region ?? "",
    deliveryType: listing.deliveryType,
    deliveryEstimate: listing.deliveryEstimate ?? "",
    expiresAt: listing.expiresAt?.toISOString() ?? "",
    images: Array.isArray(listing.images)
      ? listing.images.filter((image): image is string => typeof image === "string")
      : [],
    status: listing.status,
    reviewNote: listing.reviewNote,
    attributes: Object.fromEntries(
      listing.attributes.map((attribute) => [attribute.key, attribute.value])
    ),
    revisions: listing.revisions,
  };
}
