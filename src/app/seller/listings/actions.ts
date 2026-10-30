"use server";

import { Prisma } from "@/generated/prisma/client";
import {
  CategoryFieldType,
  DeliveryType,
  GameStatus,
  ListingStatus,
  SellerStatus,
  UserRole,
} from "@/generated/prisma/enums";
import { UTApi } from "uploadthing/server";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { requirePageRoles } from "@/lib/authorization";
import prisma from "@/lib/prisma";
import { z } from "zod";

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const maxImageSize = 8 * 1024 * 1024;
const credentialValuePattern =
  /(?:password|passcode|recovery\s+code|backup\s+code|login\s+credentials?)\s*[:=]\s*\S+/i;
const credentialFieldPattern =
  /password|passcode|credential|recovery|backup.?code|secret|2fa|two.?factor|auth.?code/i;
const listingIdSchema = z.string().trim().min(1).max(128);
const listingInputSchema = z
  .object({
    gameId: z.string().trim().min(1).max(128),
    categoryId: z.string().trim().min(1).max(128),
    title: z.string().trim().min(5).max(120),
    description: z.string().trim().min(20).max(5000),
    price: z.number().finite().min(0.01).max(9_999_999_999.99),
    currency: z.string().trim().regex(/^[A-Z]{3}$/),
    quantity: z.number().int().min(0).max(100_000),
    platform: z.string().trim().max(80),
    region: z.string().trim().max(80),
    deliveryType: z.enum(DeliveryType),
    deliveryEstimate: z.string().trim().max(120),
    expiresAt: z.string().optional(),
    images: z
      .array(
        z
          .string()
          .url()
          .refine((value) => {
            const url = new URL(value);
            return (
              url.protocol === "https:" &&
              !url.port &&
              (url.hostname === "ufs.sh" ||
                url.hostname.endsWith(".ufs.sh") ||
                url.hostname === "utfs.io" ||
                url.hostname.endsWith(".utfs.io"))
            );
          }, "Images must be hosted on UploadThing over HTTPS")
      )
      .max(5),
    attributes: z.record(z.string(), z.unknown()),
    submitForReview: z.boolean(),
  })
  .strict()
  .superRefine((input, context) => {
    if (
      credentialValuePattern.test(input.description)
    ) {
      context.addIssue({
        code: "custom",
        message: "Do not include passwords, recovery codes, or account credentials in a listing",
        path: ["description"],
      });
    }
    if (input.expiresAt && !Number.isFinite(Date.parse(input.expiresAt))) {
      context.addIssue({
        code: "custom",
        message: "Choose a valid expiration date",
        path: ["expiresAt"],
      });
    }
    if (input.expiresAt && Date.parse(input.expiresAt) <= Date.now()) {
      context.addIssue({
        code: "custom",
        message: "Expiration must be in the future",
        path: ["expiresAt"],
      });
    }
  });

type AttributeInput = string | number | boolean | string[];

async function requireSeller(): Promise<
  | { success: true; sellerId: string; userId: string }
  | { success: false; error: string }
> {
  const session = await requirePageRoles([UserRole.SELLER]);
  const seller = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, status: true },
  });
  if (!seller || seller.status !== SellerStatus.APPROVED) {
    return { success: false, error: "An approved seller profile is required" };
  }
  return { success: true, sellerId: seller.id, userId: session.user.id };
}

function validateAttributes(
  fields: {
    key: string;
    label: string;
    type: CategoryFieldType;
    isRequired: boolean;
    options: unknown;
  }[],
  attributes: Record<string, unknown>
): ActionResult<{ attributes: { key: string; label: string; value: AttributeInput }[] }> {
  const allowedKeys = new Set(fields.map((field) => field.key));
  if (Object.keys(attributes).some((key) => !allowedKeys.has(key))) {
    return { success: false, error: "Remove unsupported category attributes and try again" };
  }

  const normalized: { key: string; label: string; value: AttributeInput }[] = [];
  for (const field of fields) {
    if (credentialFieldPattern.test(`${field.key} ${field.label}`)) {
      return {
        success: false,
        error: "Credential fields are not supported. Do not store account credentials in listings.",
      };
    }
    const value = attributes[field.key];
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0)
    ) {
      if (field.isRequired) {
        return { success: false, error: `${field.label} is required` };
      }
      continue;
    }

    let valid = false;
    let normalizedValue: AttributeInput = "";
    const options = Array.isArray(field.options)
      ? field.options.filter((option): option is string => typeof option === "string")
      : [];
    switch (field.type) {
      case CategoryFieldType.TEXT:
        valid =
          typeof value === "string" &&
          value.trim().length <= 500 &&
          !credentialValuePattern.test(value);
        normalizedValue = typeof value === "string" ? value.trim() : "";
        break;
      case CategoryFieldType.NUMBER:
        valid = typeof value === "number" && Number.isFinite(value);
        normalizedValue = typeof value === "number" ? value : 0;
        break;
      case CategoryFieldType.BOOLEAN:
        valid = typeof value === "boolean";
        normalizedValue = typeof value === "boolean" ? value : false;
        break;
      case CategoryFieldType.SELECT:
        valid = typeof value === "string" && options.includes(value);
        normalizedValue = typeof value === "string" ? value : "";
        break;
      case CategoryFieldType.MULTI_SELECT:
        valid =
          Array.isArray(value) &&
          value.every((item) => typeof item === "string" && options.includes(item));
        normalizedValue = Array.isArray(value)
          ? value.filter((item): item is string => typeof item === "string")
          : [];
        break;
    }
    if (!valid) {
      return { success: false, error: `Enter a valid value for ${field.label}` };
    }
    normalized.push({ key: field.key, label: field.label, value: normalizedValue });
  }
  return { success: true, data: { attributes: normalized } };
}

function revisionSnapshot(listing: {
  id: string;
  title: string;
  description: string;
  price: Prisma.Decimal;
  currency: string;
  quantity: number;
  platform: string | null;
  region: string | null;
  deliveryType: DeliveryType;
  deliveryEstimate: string | null;
  expiresAt: Date | null;
  status: ListingStatus;
  images: string[];
  attributes: { key: string; label: string; value: AttributeInput }[];
}) {
  return {
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
    expiresAt: listing.expiresAt?.toISOString() ?? null,
    status: listing.status,
    images: listing.images,
    attributes: listing.attributes.map((attribute) => ({
      key: attribute.key,
      label: attribute.label,
      value: attribute.value,
    })),
  } satisfies Prisma.InputJsonObject;
}

function revisionAttributeValue(value: Prisma.JsonValue): AttributeInput {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value;
  }
  return JSON.stringify(value);
}

async function recordRevision(
  transaction: Prisma.TransactionClient,
  listing: Parameters<typeof revisionSnapshot>[0],
  userId: string
) {
  const revisionNumber =
    (await transaction.listingRevision.count({ where: { listingId: listing.id } })) + 1;
  await transaction.listingRevision.create({
    data: {
      listingId: listing.id,
      revisionNumber,
      changedById: userId,
      snapshot: revisionSnapshot(listing),
    },
  });
}

export async function uploadSellerListingImage(
  fileInput: File
): Promise<ActionResult<{ url: string }>> {
  const authorization = await requireSeller();
  if (!authorization.success) return { success: false, error: authorization.error };
  if (!process.env.UPLOADTHING_TOKEN) {
    return {
      success: false,
      error: "Image uploads are not configured. Set UPLOADTHING_TOKEN and try again.",
    };
  }
  if (!(fileInput instanceof File)) {
    return { success: false, error: "Choose an image file to upload" };
  }
  if (!imageTypes.has(fileInput.type)) {
    return { success: false, error: "Use a JPEG, PNG, WebP, or AVIF image" };
  }
  if (fileInput.size < 1 || fileInput.size > maxImageSize) {
    return { success: false, error: "Images must be smaller than 8 MB" };
  }

  const result = await new UTApi().uploadFiles(fileInput);
  if (result.error) {
    return { success: false, error: "Image upload failed. Please try again." };
  }
  return { success: true, data: { url: result.data.ufsUrl ?? result.data.url } };
}

export async function saveSellerListing(
  input: unknown,
  listingIdInput?: unknown
): Promise<ActionResult<{ listingId: string; status: ListingStatus }>> {
  const authorization = await requireSeller();
  if (!authorization.success) return { success: false, error: authorization.error };
  const result = listingInputSchema.safeParse(input);
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message ?? "Invalid listing details",
    };
  }
  const inputData = result.data;
  let listingId: string | undefined;
  if (listingIdInput !== undefined) {
    const parsedListingId = listingIdSchema.safeParse(listingIdInput);
    if (!parsedListingId.success) return { success: false, error: "Invalid listing id" };
    listingId = parsedListingId.data;
  }

  const [game, category, existing] = await Promise.all([
    prisma.game.findFirst({
      where: { id: inputData.gameId, status: GameStatus.PUBLISHED },
      select: { id: true },
    }),
    prisma.category.findFirst({
      where: { id: inputData.categoryId, gameId: inputData.gameId, isActive: true },
      include: { fields: { orderBy: { sortOrder: "asc" } } },
    }),
    listingId
      ? prisma.listing.findFirst({
          where: {
            id: listingId,
            sellerId: authorization.sellerId,
            status: { notIn: [ListingStatus.REMOVED, ListingStatus.SOLD_OUT] },
          },
          select: { id: true, status: true },
        })
      : Promise.resolve(null),
  ]);
  if (!game) return { success: false, error: "Choose a published game" };
  if (!category) return { success: false, error: "Choose an active category for this game" };
  if (listingId && !existing) {
    return { success: false, error: "Listing not found or no longer editable" };
  }
  if (inputData.platform && category.platforms.length > 0 &&
      !category.platforms.includes(inputData.platform)) {
    return { success: false, error: "Choose a platform supported by this category" };
  }
  const validatedAttributes = validateAttributes(category.fields, inputData.attributes);
  if (!validatedAttributes.success) return validatedAttributes;

  const duplicate = await prisma.listing.findFirst({
    where: {
      sellerId: authorization.sellerId,
      gameId: inputData.gameId,
      categoryId: inputData.categoryId,
      title: { equals: inputData.title, mode: "insensitive" },
      status: { not: ListingStatus.REMOVED },
      ...(existing ? { id: { not: existing.id } } : {}),
    },
    select: { id: true },
  });
  if (duplicate) {
    return {
      success: false,
      error: "A listing with this title already exists in this game category",
    };
  }

  const expiresAt = inputData.expiresAt ? new Date(inputData.expiresAt) : null;
  if (expiresAt && expiresAt.getTime() > Date.now() + 366 * 24 * 60 * 60 * 1000) {
    return { success: false, error: "Listings can expire no more than one year from now" };
  }
  const status = inputData.submitForReview
    ? ListingStatus.PENDING_REVIEW
    : ListingStatus.DRAFT;
  const data = {
    gameId: inputData.gameId,
    categoryId: inputData.categoryId,
    title: inputData.title,
    description: inputData.description,
    price: new Prisma.Decimal(inputData.price),
    currency: inputData.currency,
    quantity: inputData.quantity,
    platform: inputData.platform || null,
    region: inputData.region || null,
    deliveryType: inputData.deliveryType,
    deliveryEstimate: inputData.deliveryEstimate || null,
    expiresAt,
    status,
    reviewNote: inputData.submitForReview ? null : existing ? undefined : null,
    images: inputData.images,
  };

  const listing = await prisma.$transaction(async (transaction) => {
    const saved = existing
      ? await transaction.listing.update({
          where: { id: existing.id },
          data,
          select: { id: true, title: true, description: true, price: true, currency: true,
            quantity: true, platform: true, region: true, deliveryType: true,
            deliveryEstimate: true, expiresAt: true, status: true, images: true },
        })
      : await transaction.listing.create({
          data: { ...data, sellerId: authorization.sellerId },
          select: { id: true, title: true, description: true, price: true, currency: true,
            quantity: true, platform: true, region: true, deliveryType: true,
            deliveryEstimate: true, expiresAt: true, status: true, images: true },
        });
    await transaction.listingAttribute.deleteMany({ where: { listingId: saved.id } });
    if (validatedAttributes.data.attributes.length > 0) {
      await transaction.listingAttribute.createMany({
        data: validatedAttributes.data.attributes.map((attribute) => ({
          listingId: saved.id,
          ...attribute,
        })),
      });
    }
    await recordRevision(
      transaction,
      {
        ...saved,
        images: Array.isArray(saved.images)
          ? saved.images.filter((image): image is string => typeof image === "string")
          : [],
        attributes: validatedAttributes.data.attributes,
      },
      authorization.userId
    );
    return saved;
  });

  revalidatePath("/seller/listings");
  revalidatePath(`/offers/${listing.id}`);
  return { success: true, data: { listingId: listing.id, status: listing.status } };
}

export async function updateSellerListingAvailability(
  listingIdInput: unknown,
  input: unknown
): Promise<ActionResult<{ status: ListingStatus; quantity: number }>> {
  const authorization = await requireSeller();
  if (!authorization.success) return { success: false, error: authorization.error };
  const listingId = listingIdSchema.safeParse(listingIdInput);
  const values = z
    .object({
      price: z.number().finite().min(0.01).max(9_999_999_999.99),
      quantity: z.number().int().min(0).max(100_000),
    })
    .safeParse(input);
  if (!listingId.success || !values.success) {
    return { success: false, error: "Enter a valid price and quantity" };
  }

  const current = await prisma.listing.findFirst({
    where: {
      id: listingId.data,
      sellerId: authorization.sellerId,
      status: { in: [ListingStatus.ACTIVE, ListingStatus.PAUSED, ListingStatus.SOLD_OUT] },
    },
    include: { attributes: true },
  });
  if (!current) return { success: false, error: "Listing is not available for updates" };

  const status =
    values.data.quantity === 0
      ? ListingStatus.SOLD_OUT
      : current.status === ListingStatus.SOLD_OUT
        ? ListingStatus.PENDING_REVIEW
        : current.status;
  const updated = await prisma.$transaction(async (transaction) => {
    const saved = await transaction.listing.update({
      where: { id: current.id },
      data: { price: new Prisma.Decimal(values.data.price), quantity: values.data.quantity, status },
    });
    await recordRevision(
      transaction,
      {
        ...saved,
        images: Array.isArray(saved.images)
          ? saved.images.filter((image): image is string => typeof image === "string")
          : [],
        attributes: current.attributes.map((attribute) => ({
          key: attribute.key,
          label: attribute.label,
          value: revisionAttributeValue(attribute.value),
        })),
      },
      authorization.userId
    );
    return saved;
  });
  revalidatePath("/seller/listings");
  revalidatePath(`/offers/${updated.id}`);
  return { success: true, data: { status: updated.status, quantity: updated.quantity } };
}

export async function setSellerListingStatus(
  listingIdInput: unknown,
  statusInput: unknown
): Promise<ActionResult<{ status: ListingStatus }>> {
  const authorization = await requireSeller();
  if (!authorization.success) return { success: false, error: authorization.error };
  const listingId = listingIdSchema.safeParse(listingIdInput);
  const status = z.enum([ListingStatus.ACTIVE, ListingStatus.PAUSED]).safeParse(statusInput);
  if (!listingId.success || !status.success) {
    return { success: false, error: "Invalid listing status" };
  }

  const current = await prisma.listing.findFirst({
    where: { id: listingId.data, sellerId: authorization.sellerId },
    include: { attributes: true },
  });
  if (!current || current.status === ListingStatus.REMOVED) {
    return { success: false, error: "Listing not found" };
  }
  if (status.data === ListingStatus.ACTIVE) {
    if (current.status !== ListingStatus.PAUSED) {
      return { success: false, error: "Only paused listings can be reactivated" };
    }
    if (current.quantity < 1) {
      return { success: false, error: "Add available quantity before reactivating" };
    }
    if (current.expiresAt && current.expiresAt <= new Date()) {
      return { success: false, error: "This listing has expired; edit it and submit it for review" };
    }
  } else if (current.status !== ListingStatus.ACTIVE) {
    return { success: false, error: "Only active listings can be paused" };
  }

  const updated = await prisma.$transaction(async (transaction) => {
    const saved = await transaction.listing.update({
      where: { id: current.id },
      data: { status: status.data },
    });
    await recordRevision(
      transaction,
      {
        ...saved,
        images: Array.isArray(saved.images)
          ? saved.images.filter((image): image is string => typeof image === "string")
          : [],
        attributes: current.attributes.map((attribute) => ({
          key: attribute.key,
          label: attribute.label,
          value: revisionAttributeValue(attribute.value),
        })),
      },
      authorization.userId
    );
    return saved;
  });
  revalidatePath("/seller/listings");
  revalidatePath(`/offers/${updated.id}`);
  return { success: true, data: { status: updated.status } };
}

export async function deleteSellerListing(
  listingIdInput: unknown
): Promise<ActionResult<{ deleted: true }>> {
  const authorization = await requireSeller();
  if (!authorization.success) return { success: false, error: authorization.error };
  const listingId = listingIdSchema.safeParse(listingIdInput);
  if (!listingId.success) return { success: false, error: "Invalid listing id" };

  const listing = await prisma.listing.findFirst({
    where: { id: listingId.data, sellerId: authorization.sellerId },
    include: { attributes: true },
  });
  if (!listing || listing.status === ListingStatus.REMOVED) {
    return { success: false, error: "Listing not found" };
  }
  const removed = await prisma.$transaction(async (transaction) => {
    const saved = await transaction.listing.update({
      where: { id: listing.id },
      data: { status: ListingStatus.REMOVED, publishedAt: null },
    });
    await recordRevision(
      transaction,
      {
        ...saved,
        images: Array.isArray(saved.images)
          ? saved.images.filter((image): image is string => typeof image === "string")
          : [],
        attributes: listing.attributes.map((attribute) => ({
          key: attribute.key,
          label: attribute.label,
          value: revisionAttributeValue(attribute.value),
        })),
      },
      authorization.userId
    );
    return saved;
  });
  revalidatePath("/seller/listings");
  revalidatePath(`/offers/${removed.id}`);
  return { success: true, data: { deleted: true } };
}

export async function bulkUpdateSellerListings(
  listingIdsInput: unknown,
  operationInput: unknown,
  quantityInput?: unknown
): Promise<ActionResult<{ updated: number }>> {
  const authorization = await requireSeller();
  if (!authorization.success) return { success: false, error: authorization.error };
  const listingIds = z.array(listingIdSchema).min(1).max(100).safeParse(listingIdsInput);
  const operation = z.enum(["pause", "reactivate", "set-stock"]).safeParse(operationInput);
  if (!listingIds.success || !operation.success) {
    return { success: false, error: "Select up to 100 listings and choose a valid operation" };
  }
  if (new Set(listingIds.data).size !== listingIds.data.length) {
    return { success: false, error: "Selected listing ids must be unique" };
  }
  const quantity =
    operation.data === "set-stock"
      ? z.number().int().min(0).max(100_000).safeParse(quantityInput)
      : undefined;
  if (quantity && !quantity.success) {
    return { success: false, error: "Enter a valid stock quantity" };
  }
  const stockQuantity = quantity?.success ? quantity.data : undefined;

  const listings = await prisma.listing.findMany({
    where: {
      id: { in: listingIds.data },
      sellerId: authorization.sellerId,
      status: { notIn: [ListingStatus.REMOVED, ListingStatus.PENDING_REVIEW] },
    },
    include: { attributes: true },
  });
  if (listings.length !== listingIds.data.length) {
    return { success: false, error: "One or more selected listings are unavailable" };
  }

  const updates: {
    listing: (typeof listings)[number];
    status: ListingStatus;
    quantity: number;
  }[] = [];
  for (const listing of listings) {
    let status = listing.status;
    let quantityValue = listing.quantity;
    if (operation.data === "pause") {
      if (listing.status !== ListingStatus.ACTIVE) {
        return { success: false, error: "Bulk pause only supports active listings" };
      }
      status = ListingStatus.PAUSED;
    } else if (operation.data === "reactivate") {
      if (
        listing.status !== ListingStatus.PAUSED ||
        listing.quantity < 1 ||
        (listing.expiresAt !== null && listing.expiresAt <= new Date())
      ) {
        return {
          success: false,
          error: "Bulk reactivate requires every listing to be paused, in stock, and unexpired",
        };
      }
      status = ListingStatus.ACTIVE;
    } else {
      if (stockQuantity === undefined) {
        return { success: false, error: "Enter a valid stock quantity" };
      }
      if (
        listing.status !== ListingStatus.ACTIVE &&
        listing.status !== ListingStatus.PAUSED &&
        listing.status !== ListingStatus.SOLD_OUT
      ) {
        return {
          success: false,
          error: "Stock can only be updated for active, paused, or sold listings",
        };
      }
      quantityValue = stockQuantity;
      if (quantityValue === 0) status = ListingStatus.SOLD_OUT;
      else if (listing.status === ListingStatus.SOLD_OUT) status = ListingStatus.PENDING_REVIEW;
    }
    updates.push({ listing, status, quantity: quantityValue });
  }

  await prisma.$transaction(async (transaction) => {
    for (const { listing, status, quantity: quantityValue } of updates) {
      const saved = await transaction.listing.update({
        where: { id: listing.id },
        data: {
          status,
          quantity: quantityValue,
          ...(operation.data === "set-stock" && listing.status === ListingStatus.SOLD_OUT && quantityValue > 0
            ? { reviewNote: "Stock restored; resubmitted for moderation" }
            : {}),
        },
      });
      await recordRevision(
        transaction,
        {
          ...saved,
          images: Array.isArray(saved.images)
            ? saved.images.filter((image): image is string => typeof image === "string")
            : [],
          attributes: listing.attributes.map((attribute) => ({
            key: attribute.key,
            label: attribute.label,
            value: revisionAttributeValue(attribute.value),
          })),
        },
        authorization.userId
      );
    }
  }, { timeout: 30_000 });
  revalidatePath("/seller/listings");
  return { success: true, data: { updated: listings.length } };
}
