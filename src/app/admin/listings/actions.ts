"use server";

import { Prisma } from "@/generated/prisma/client";
import { ListingStatus, UserRole } from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { requirePageRoles } from "@/lib/authorization";
import prisma from "@/lib/prisma";
import { z } from "zod";

export async function reviewListing(
  listingIdInput: unknown,
  decisionInput: unknown,
  noteInput: unknown
): Promise<ActionResult<{ status: ListingStatus }>> {
  const authorization = await requirePageRoles([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const listingId = z.string().trim().min(1).max(128).safeParse(listingIdInput);
  const decision = z.enum(["approve", "return"]).safeParse(decisionInput);
  const note = z.string().trim().max(1000).safeParse(noteInput);
  if (!listingId.success || !decision.success || !note.success) {
    return { success: false, error: "Invalid listing review details" };
  }

  const listing = await prisma.listing.findFirst({
    where: { id: listingId.data, status: ListingStatus.PENDING_REVIEW },
    include: { attributes: true },
  });
  if (!listing) {
    return { success: false, error: "This listing is no longer awaiting review" };
  }
  if (decision.data === "approve" && listing.quantity < 1) {
    return { success: false, error: "A listing needs available quantity before approval" };
  }
  if (
    decision.data === "approve" &&
    listing.expiresAt !== null &&
    listing.expiresAt <= new Date()
  ) {
    return { success: false, error: "An expired listing cannot be approved" };
  }
  if (decision.data === "return" && note.data.length < 5) {
    return { success: false, error: "Add a short reason when returning a listing to the seller" };
  }

  const status =
    decision.data === "approve" ? ListingStatus.ACTIVE : ListingStatus.DRAFT;
  const result = await prisma.$transaction(async (transaction) => {
    const changed = await transaction.listing.updateMany({
      where: { id: listing.id, status: ListingStatus.PENDING_REVIEW },
      data: {
        status,
        publishedAt: status === ListingStatus.ACTIVE ? new Date() : null,
        reviewNote: status === ListingStatus.DRAFT ? note.data : null,
      },
    });
    if (changed.count !== 1) return false;
    const revisionNumber =
      (await transaction.listingRevision.count({ where: { listingId: listing.id } })) + 1;
    await transaction.listingRevision.create({
      data: {
        listingId: listing.id,
        revisionNumber,
        changedById: authorization.user.id,
        snapshot: {
          moderation: {
            previousStatus: ListingStatus.PENDING_REVIEW,
            status,
            note: status === ListingStatus.DRAFT ? note.data : null,
          },
          title: listing.title,
          price: listing.price.toString(),
          quantity: listing.quantity,
          reviewedAt: new Date().toISOString(),
        } satisfies Prisma.InputJsonObject,
      },
    });
    await transaction.auditLog.create({
      data: {
        actorId: authorization.user.id,
        action: status === ListingStatus.ACTIVE ? "listing.approved" : "listing.returned",
        entityType: "Listing",
        entityId: listing.id,
        metadata: { previousStatus: ListingStatus.PENDING_REVIEW, status, note: note.data },
      },
    });
    return true;
  });
  if (!result) {
    return { success: false, error: "This listing was reviewed by another administrator" };
  }

  revalidatePath("/admin/listings");
  revalidatePath("/seller/listings");
  revalidatePath(`/offers/${listing.id}`);
  return { success: true, data: { status } };
}
