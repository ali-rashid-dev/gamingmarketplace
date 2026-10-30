import { Prisma, PrismaClient } from "../src/generated/prisma/client";
import { DeliveryType, GameStatus, ListingStatus, SellerStatus, UserRole } from "../src/generated/prisma/enums";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const sellerUser = {
  id: "seed-demo-seller",
  email: "demo-seller@gamingmarketplace.invalid",
};
const sellerProfileId = "seed-demo-seller-profile";

const games = [
  {
    id: "seed-game-fortnite",
    name: "Fortnite",
    slug: "seed-fortnite",
    categories: [
      {
        id: "seed-category-fortnite-accounts",
        name: "Game Accounts",
        slug: "seed-accounts",
        type: "ACCOUNTS",
        platforms: ["PC", "PlayStation", "Xbox"],
        fields: [{ key: "cosmetics", label: "Included cosmetics", type: "TEXT" as const }],
      },
      {
        id: "seed-category-fortnite-topups",
        name: "Top-ups",
        slug: "seed-top-ups",
        type: "TOP_UPS",
        platforms: ["PC", "PlayStation", "Xbox"],
        fields: [{ key: "delivery", label: "Delivery details", type: "TEXT" as const }],
      },
    ],
  },
  {
    id: "seed-game-minecraft",
    name: "Minecraft",
    slug: "seed-minecraft",
    categories: [
      {
        id: "seed-category-minecraft-items",
        name: "Virtual Items",
        slug: "seed-items",
        type: "ITEMS",
        platforms: ["PC"],
        fields: [{ key: "item", label: "Item details", type: "TEXT" as const }],
      },
    ],
  },
];

const listings = [
  {
    id: "seed-listing-fortnite-account",
    gameSlug: "seed-fortnite",
    categorySlug: "seed-accounts",
    title: "Demo Fortnite account with cosmetic bundle",
    description:
      "Test offer for marketplace browsing. Includes a sample set of cosmetic items. No account credentials are included.",
    price: "24.99",
    quantity: 2,
    platform: "PC",
    attributes: { cosmetics: "Sample outfit, pickaxe, and glider collection" },
  },
  {
    id: "seed-listing-fortnite-topup",
    gameSlug: "seed-fortnite",
    categorySlug: "seed-top-ups",
    title: "Demo Fortnite top-up service",
    description:
      "Test offer for marketplace browsing. This sample listing is not redeemable and has no real-world value.",
    price: "9.99",
    quantity: 10,
    platform: "PC",
    attributes: { delivery: "Sample manual delivery, not a real top-up" },
  },
  {
    id: "seed-listing-minecraft-item",
    gameSlug: "seed-minecraft",
    categorySlug: "seed-items",
    title: "Demo Minecraft virtual item bundle",
    description:
      "Test offer for marketplace browsing. Sample virtual items only; no real delivery or game entitlement is provided.",
    price: "4.50",
    quantity: 5,
    platform: "PC",
    attributes: { item: "Sample block and decoration bundle" },
  },
];

async function seed() {
  await prisma.user.upsert({
    where: { id: sellerUser.id },
    update: { name: "Demo Seller", role: UserRole.SELLER, emailVerified: true },
    create: {
      ...sellerUser,
      name: "Demo Seller",
      role: UserRole.SELLER,
      emailVerified: true,
    },
  });

  await prisma.sellerProfile.upsert({
    where: { id: sellerProfileId },
    update: {
      shopName: "Demo Test Shop",
      description: "Seeded test shop. Offers are examples and are not for sale.",
      status: SellerStatus.APPROVED,
      isAvailable: true,
    },
    create: {
      id: sellerProfileId,
      userId: sellerUser.id,
      shopName: "Demo Test Shop",
      slug: "seed-demo-test-shop",
      description: "Seeded test shop. Offers are examples and are not for sale.",
      status: SellerStatus.APPROVED,
      isAvailable: true,
    },
  });

  for (const gameData of games) {
    const game = await prisma.game.upsert({
      where: { slug: gameData.slug },
      update: { name: gameData.name, status: GameStatus.PUBLISHED },
      create: {
        id: gameData.id,
        name: gameData.name,
        slug: gameData.slug,
        status: GameStatus.PUBLISHED,
      },
    });

    for (const categoryData of gameData.categories) {
      const category = await prisma.category.upsert({
        where: {
          gameId_slug: { gameId: game.id, slug: categoryData.slug },
        },
        update: {
          name: categoryData.name,
          type: categoryData.type,
          platforms: categoryData.platforms,
          isActive: true,
        },
        create: {
          id: categoryData.id,
          gameId: game.id,
          name: categoryData.name,
          slug: categoryData.slug,
          type: categoryData.type,
          platforms: categoryData.platforms,
        },
      });

      for (const field of categoryData.fields) {
        await prisma.categoryField.upsert({
          where: { categoryId_key: { categoryId: category.id, key: field.key } },
          update: { label: field.label, type: field.type, isRequired: false },
          create: {
            id: `seed-field-${categoryData.id}-${field.key}`,
            categoryId: category.id,
            key: field.key,
            label: field.label,
            type: field.type,
          },
        });
      }
    }
  }

  for (const listingData of listings) {
    const game = games.find((item) => item.slug === listingData.gameSlug)!;
    const categoryData = game.categories.find(
      (item) => item.slug === listingData.categorySlug
    )!;
    const category = await prisma.category.findUniqueOrThrow({
      where: { gameId_slug: { gameId: game.id, slug: categoryData.slug } },
    });
    const price = new Prisma.Decimal(listingData.price);
    const publishedAt = new Date();
    const listing = await prisma.listing.upsert({
      where: { id: listingData.id },
      update: {
        sellerId: sellerProfileId,
        gameId: game.id,
        categoryId: category.id,
        title: listingData.title,
        description: listingData.description,
        price,
        currency: "USD",
        quantity: listingData.quantity,
        platform: listingData.platform,
        deliveryType: DeliveryType.MANUAL,
        status: ListingStatus.ACTIVE,
        publishedAt,
        images: [],
      },
      create: {
        id: listingData.id,
        sellerId: sellerProfileId,
        gameId: game.id,
        categoryId: category.id,
        title: listingData.title,
        description: listingData.description,
        price,
        currency: "USD",
        quantity: listingData.quantity,
        platform: listingData.platform,
        deliveryType: DeliveryType.MANUAL,
        status: ListingStatus.ACTIVE,
        publishedAt,
        images: [],
      },
    });

    await prisma.listingAttribute.deleteMany({ where: { listingId: listing.id } });
    await prisma.listingAttribute.createMany({
      data: Object.entries(listingData.attributes).map(([key, value]) => ({
        listingId: listing.id,
        key,
        label: categoryData.fields.find((field) => field.key === key)!.label,
        value,
      })),
    });
  }

  console.log(`Seeded ${games.length} games and ${listings.length} demo listings.`);
}

seed()
  .catch((error: unknown) => {
    console.error("Failed to seed marketplace test data", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
