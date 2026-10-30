import prisma from "@/lib/prisma";
import { ListingReviewQueue } from "./listing-review-queue";

export default async function AdminListingReviewPage() {
  const listings = await prisma.listing.findMany({
    where: { status: "PENDING_REVIEW" },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 100,
    include: {
      game: { select: { name: true } },
      category: { select: { name: true, type: true } },
      seller: { select: { shopName: true } },
      attributes: { orderBy: { key: "asc" } },
    },
  });
  const queue = listings.map((listing) => ({
    id: listing.id,
    title: listing.title,
    description: listing.description,
    price: listing.price.toString(),
    currency: listing.currency,
    quantity: listing.quantity,
    platform: listing.platform,
    region: listing.region,
    deliveryType: listing.deliveryType,
    deliveryEstimate: listing.deliveryEstimate,
    expiresAt: listing.expiresAt,
    images: Array.isArray(listing.images)
      ? listing.images.filter((image): image is string => typeof image === "string")
      : [],
    createdAt: listing.createdAt,
    game: listing.game,
    category: listing.category,
    seller: listing.seller,
    attributes: listing.attributes.map((attribute) => ({
      id: attribute.id,
      label: attribute.label,
      value: attribute.value,
    })),
  }));
  return <ListingReviewQueue listings={queue} />;
}
