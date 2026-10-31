"use server";

import { Prisma } from "@/generated/prisma/client";
import { GameStatus } from "@/generated/prisma/enums";
import { UTApi } from "uploadthing/server";
import { requirePagePermissions } from "@/lib/authorization";
import {
  categoryPatchSchema,
  categorySchema,
  gamePatchSchema,
  gameSchema,
} from "@/lib/catalog-validation";
import { getCatalogGames } from "./catalog-data";
import type {
  CatalogActionResult,
  CatalogGame,
} from "./catalog-types";
import prisma from "@/lib/prisma";
import { z } from "zod";

const gameIdSchema = z.string().min(1).max(128);
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const allowedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

async function requireCatalogAdmin() {
  return requirePagePermissions(["games.manage"]);
}

function validationError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid catalog data";
}

function isPrismaError(
  error: unknown,
  code: string
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}

export async function createCatalogGame(
  input: unknown
): Promise<CatalogActionResult<{ games: CatalogGame[]; gameId: string }>> {
  const authorization = await requireCatalogAdmin();
  const result = gameSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: validationError(result.error) };
  }

  try {
    const game = await prisma.$transaction(async (transaction) => {
      const created = await transaction.game.create({ data: result.data });
      await transaction.auditLog.create({
        data: {
          actorId: authorization.user.id,
          action: "catalog.game.created",
          entityType: "Game",
          entityId: created.id,
        },
      });
      return created;
    });

    return {
      success: true,
      data: { games: await getCatalogGames(), gameId: game.id },
    };
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      return {
        success: false,
        error: "A game with that name or slug already exists",
      };
    }
    throw error;
  }
}

export async function updateCatalogGame(
  gameIdInput: unknown,
  input: unknown
): Promise<CatalogActionResult<{ games: CatalogGame[] }>> {
  const authorization = await requireCatalogAdmin();
  const gameId = gameIdSchema.safeParse(gameIdInput);
  if (!gameId.success) {
    return { success: false, error: "Invalid game id" };
  }

  const result = gamePatchSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: validationError(result.error) };
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const updated = await transaction.game.update({
        where: { id: gameId.data },
        data: result.data,
      });
      await transaction.auditLog.create({
        data: {
          actorId: authorization.user.id,
          action: "catalog.game.updated",
          entityType: "Game",
          entityId: updated.id,
          metadata: { updatedFields: Object.keys(result.data) },
        },
      });
    });
    return {
      success: true,
      data: { games: await getCatalogGames() },
    };
  } catch (error) {
    if (isPrismaError(error, "P2025")) {
      return { success: false, error: "Game not found" };
    }
    if (isPrismaError(error, "P2002")) {
      return {
        success: false,
        error: "A game with that name or slug already exists",
      };
    }
    throw error;
  }
}

export async function setCatalogGameStatus(
  gameIdInput: unknown,
  statusInput: unknown
): Promise<CatalogActionResult<{ games: CatalogGame[] }>> {
  const gameId = gameIdSchema.safeParse(gameIdInput);
  if (!gameId.success) {
    return { success: false, error: "Invalid game id" };
  }
  const status = z.enum(GameStatus).safeParse(statusInput);
  if (!status.success) {
    return { success: false, error: "Invalid game status" };
  }

  return updateCatalogGame(gameId.data, { status: status.data });
}

export async function createCatalogCategory(
  gameIdInput: unknown,
  input: unknown
): Promise<CatalogActionResult<{ games: CatalogGame[] }>> {
  const authorization = await requireCatalogAdmin();
  const gameId = gameIdSchema.safeParse(gameIdInput);
  if (!gameId.success) {
    return { success: false, error: "Invalid game id" };
  }

  const result = categorySchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: validationError(result.error) };
  }

  const gameExists = await prisma.game.findUnique({
    where: { id: gameId.data },
    select: { id: true },
  });
  if (!gameExists) {
    return { success: false, error: "Game not found" };
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const created = await transaction.category.create({
        data: {
          gameId: gameId.data,
          name: result.data.name,
          slug: result.data.slug,
          type: result.data.type,
          description: result.data.description,
          platforms: result.data.platforms,
          isActive: result.data.isActive,
          fields: {
            create: result.data.fields.map((field) => ({
              ...field,
              options: field.options,
            })),
          },
        },
      });
      await transaction.auditLog.create({
        data: {
          actorId: authorization.user.id,
          action: "catalog.category.created",
          entityType: "Category",
          entityId: created.id,
          metadata: { gameId: gameId.data, name: created.name, slug: created.slug },
        },
      });
    });
    return {
      success: true,
      data: { games: await getCatalogGames() },
    };
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      return {
        success: false,
        error: "A category with that slug or field key already exists",
      };
    }
    throw error;
  }
}

export async function updateCatalogCategory(
  categoryIdInput: unknown,
  input: unknown
): Promise<CatalogActionResult<{ games: CatalogGame[] }>> {
  const authorization = await requireCatalogAdmin();
  const categoryId = gameIdSchema.safeParse(categoryIdInput);
  if (!categoryId.success) {
    return { success: false, error: "Invalid category id" };
  }

  const result = categoryPatchSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: validationError(result.error) };
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const { fields, ...categoryData } = result.data;
      const updated = await transaction.category.update({
        where: { id: categoryId.data },
        data: categoryData,
      });
      if (fields !== undefined) {
        await transaction.categoryField.deleteMany({
          where: {
            categoryId: updated.id,
            ...(fields.length > 0
              ? { key: { notIn: fields.map((field) => field.key) } }
              : {}),
          },
        });

        for (const { key, ...field } of fields) {
          await transaction.categoryField.upsert({
            where: {
              categoryId_key: {
                categoryId: updated.id,
                key,
              },
            },
            update: { ...field, options: field.options },
            create: {
              categoryId: updated.id,
              key,
              ...field,
              options: field.options,
            },
          });
        }
      }
      await transaction.auditLog.create({
        data: {
          actorId: authorization.user.id,
          action: "catalog.category.updated",
          entityType: "Category",
          entityId: updated.id,
          metadata: {
            updatedFields: Object.keys(result.data),
            name: updated.name,
            slug: updated.slug,
          },
        },
      });
    });
    return {
      success: true,
      data: { games: await getCatalogGames() },
    };
  } catch (error) {
    if (isPrismaError(error, "P2025")) {
      return { success: false, error: "Category not found" };
    }
    if (isPrismaError(error, "P2002")) {
      return {
        success: false,
        error: "A category with that slug or field key already exists",
      };
    }
    throw error;
  }
}

export async function uploadCatalogImage(
  fileInput: File
): Promise<CatalogActionResult<{ url: string }>> {
  await requireCatalogAdmin();

  if (!process.env.UPLOADTHING_TOKEN) {
    return {
      success: false,
      error: "Image uploads are not configured. Set UPLOADTHING_TOKEN and try again.",
    };
  }
  if (!(fileInput instanceof File)) {
    return { success: false, error: "Choose an image file to upload" };
  }
  if (!allowedImageTypes.has(fileInput.type)) {
    return {
      success: false,
      error: "Use a JPEG, PNG, WebP, or AVIF image",
    };
  }
  if (fileInput.size < 1 || fileInput.size > MAX_IMAGE_SIZE) {
    return { success: false, error: "Images must be smaller than 8 MB" };
  }

  const result = await new UTApi().uploadFiles(fileInput);
  if (result.error) {
    return {
      success: false,
      error: "Image upload failed. Please try again.",
    };
  }

  return {
    success: true,
    data: { url: result.data.ufsUrl ?? result.data.url },
  };
}