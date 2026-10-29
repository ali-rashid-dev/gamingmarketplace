import { CategoryFieldType, GameStatus } from "@/generated/prisma/enums";
import { z } from "zod";

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens");

const nullableText = (max: number) =>
  z.string().trim().max(max).nullable().optional();

export const gameSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    slug: slugSchema,
    description: nullableText(5000),
    logoUrl: z.string().url().nullable().optional(),
    coverImageUrl: z.string().url().nullable().optional(),
    seoTitle: nullableText(70),
    seoDescription: nullableText(160),
    status: z.enum(GameStatus).optional(),
  })
  .strict();

export const gamePatchSchema = gameSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "Provide at least one field to update"
);

const categoryFieldSchema = z
  .object({
    key: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "Use letters, numbers, and underscores"),
    label: z.string().trim().min(1).max(100),
    type: z.enum(CategoryFieldType),
    isRequired: z.boolean(),
    options: z.array(z.string().trim().min(1).max(100)).max(50),
    sortOrder: z.number().int().min(0).max(1000),
  })
  .strict()
  .superRefine((field, context) => {
    if (
      (field.type === CategoryFieldType.SELECT ||
        field.type === CategoryFieldType.MULTI_SELECT) &&
      field.options.length === 0
    ) {
      context.addIssue({
        code: "custom",
        message: "Select fields must have at least one option",
        path: ["options"],
      });
    }

    if (
      field.type !== CategoryFieldType.SELECT &&
      field.type !== CategoryFieldType.MULTI_SELECT &&
      field.options.length > 0
    ) {
      context.addIssue({
        code: "custom",
        message: "Only select fields can have options",
        path: ["options"],
      });
    }
  });

const categoryBaseSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    slug: slugSchema,
    type: z.string().trim().min(1).max(64),
    description: nullableText(2000),
    platforms: z.array(z.string().trim().min(1).max(50)).max(30),
    isActive: z.boolean(),
    fields: z.array(categoryFieldSchema).max(50),
  })
  .strict();

function validateCategory(
  category: {
    fields?: { key: string }[];
    platforms?: string[];
  },
  context: z.RefinementCtx
) {
  if (category.fields) {
    const keys = category.fields.map((field) => field.key.toLowerCase());
    if (new Set(keys).size !== keys.length) {
      context.addIssue({
        code: "custom",
        message: "Field keys must be unique within a category",
        path: ["fields"],
      });
    }
  }
  if (
    category.platforms &&
    new Set(category.platforms.map((platform) => platform.toLowerCase())).size !==
      category.platforms.length
  ) {
    context.addIssue({
      code: "custom",
      message: "Supported platforms must be unique",
      path: ["platforms"],
    });
  }
}

export const categorySchema = categoryBaseSchema.superRefine(validateCategory);

export const categoryPatchSchema = categoryBaseSchema
  .partial()
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    "Provide at least one field to update"
  )
  .superRefine(validateCategory);
