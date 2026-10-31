"use server";

import { ReviewStatus } from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { requireApprovedSeller } from "@/app/seller/listings/listing-data";
import prisma from "@/lib/prisma";
import { z } from "zod";

export async function respondToReview(
  reviewIdInput: unknown,
  responseInput: unknown
): Promise<ActionResult<{ saved: true }>> {
  const { sellerId, userId } = await requireApprovedSeller();
  const reviewId = z.string().trim().min(1).max(128).safeParse(reviewIdInput);
  const response = z.string().trim().min(3).max(1000).safeParse(responseInput);
  if (!reviewId.success || !response.success) {
    return { success: false, error: "Enter a response between 3 and 1,000 characters" };
  }
  if (/(?:password|passcode|recovery\s+code|backup\s+code|login\s+credentials?)\s*[:=]\s*\S+/i.test(response.data)) {
    return { success: false, error: "Do not include account credentials in a public response" };
  }
  const updated = await prisma.$transaction(async (transaction) => {
    const changed = await transaction.review.updateMany({
      where: {
        id: reviewId.data,
        sellerId,
        status: ReviewStatus.PUBLISHED,
      },
      data: { sellerResponse: response.data, sellerRespondedAt: new Date() },
    });
    if (changed.count !== 1) return false;
    await transaction.auditLog.create({
      data: {
        actorId: userId,
        action: "review.seller_responded",
        entityType: "Review",
        entityId: reviewId.data,
      },
    });
    return true;
  });
  if (!updated) return { success: false, error: "Review not found or unavailable" };
  const seller = await prisma.sellerProfile.findUniqueOrThrow({
    where: { id: sellerId },
    select: { slug: true },
  });
  revalidatePath("/seller/reviews");
  revalidatePath(`/shops/${seller.slug}`);
  return { success: true, data: { saved: true } };
}
