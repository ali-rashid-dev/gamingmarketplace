"use server";

import { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { requirePageSession } from "@/lib/authorization";
import type { ActionResult } from "@/lib/action-result";
import { z } from "zod";

const profileSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3)
      .max(24)
      .regex(/^[a-zA-Z0-9_]+$/)
      .optional(),
    displayName: z.string().trim().max(80).nullable().optional(),
    bio: z.string().trim().max(500).nullable().optional(),
    locale: z.string().trim().min(2).max(16).optional(),
    preferredCurrency: z.string().regex(/^[A-Z]{3}$/).optional(),
    emailNotifications: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Provide profile fields to update");

type AccountProfile = {
  username: string;
  displayName: string | null;
  bio: string | null;
  locale: string;
  preferredCurrency: string;
  emailNotifications: boolean;
};

const profileSelection = {
  username: true,
  displayName: true,
  bio: true,
  locale: true,
  preferredCurrency: true,
  emailNotifications: true,
} as const;

export async function getAccountProfile(): Promise<
  ActionResult<{ profile: AccountProfile | null }>
> {
  const { user } = await requirePageSession();
  const profile = await prisma.accountProfile.findUnique({
    where: { userId: user.id },
    select: profileSelection,
  });
  return { success: true, data: { profile } };
}

export async function updateAccountProfile(
  input: unknown
): Promise<ActionResult<{ profile: AccountProfile }>> {
  const { user } = await requirePageSession();
  const result = profileSchema.safeParse(input);
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message ?? "Invalid profile data",
    };
  }

  const existing = await prisma.accountProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!existing && !result.data.username) {
    return {
      success: false,
      error: "A username is required to create your profile",
    };
  }

  try {
    const profile = await prisma.accountProfile.upsert({
      where: { userId: user.id },
      update: result.data,
      create: {
        userId: user.id,
        username: result.data.username!,
        displayName: result.data.displayName,
        bio: result.data.bio,
        locale: result.data.locale,
        preferredCurrency: result.data.preferredCurrency,
        emailNotifications: result.data.emailNotifications,
      },
      select: profileSelection,
    });
    return { success: true, data: { profile } };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "That username is already in use" };
    }
    throw error;
  }
}
