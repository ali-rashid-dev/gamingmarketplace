import type { CategoryFieldType, GameStatus } from "@/generated/prisma/enums";
import type { ActionResult } from "@/lib/action-result";

export type CatalogField = {
  id: string;
  key: string;
  label: string;
  type: CategoryFieldType;
  isRequired: boolean;
  options: string[];
  sortOrder: number;
};

export type CatalogCategory = {
  id: string;
  gameId: string;
  name: string;
  slug: string;
  type: string;
  description: string | null;
  platforms: string[];
  isActive: boolean;
  fields: CatalogField[];
};

export type CatalogGame = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  status: GameStatus;
  listingCount: number;
  categories: CatalogCategory[];
};

export type CatalogFieldInput = Omit<CatalogField, "id">;

export type CatalogGameInput = Omit<CatalogGame, "id" | "listingCount" | "categories">;

export type CatalogCategoryInput = Omit<CatalogCategory, "id" | "gameId" | "fields"> & {
  fields: CatalogFieldInput[];
};

export type CatalogActionResult<T> = ActionResult<T>;
