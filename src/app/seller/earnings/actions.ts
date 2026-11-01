"use server";

import {
  LedgerEntryType,
  LedgerSourceType,
  NotificationType,
  WithdrawalStatus,
} from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import type { ActionResult } from "@/lib/action-result";
import { requirePagePermissions } from "@/lib/authorization";
import { enqueueUserNotification } from "@/lib/notification-outbox";
import { getAvailableSellerBalance } from "@/lib/finance-ledger";
import { requireApprovedSeller } from "@/app/seller/listings/listing-data";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const currencySchema = z.string().regex(/^[A-Z]{3}$/);
const amountSchema = z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/);

export async function requestWithdrawal(
  _previousState: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const { sellerId, userId } = await requireApprovedSeller();
  const amountInput = amountSchema.safeParse(formData.get("amount"));
  const currencyInput = currencySchema.safeParse(formData.get("currency"));
  if (!amountInput.success || !currencyInput.success) {
    return { success: false, error: "Enter a positive amount and a valid currency." };
  }

  const amount = new Prisma.Decimal(amountInput.data);
  if (amount.lessThanOrEqualTo(0)) {
    return { success: false, error: "Withdrawal amount must be greater than zero." };
  }
  const withdrawalId = crypto.randomUUID();
  const result = await prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT "id" FROM "SellerProfile" WHERE "id" = ${sellerId} FOR UPDATE`;
    const balance = await getAvailableSellerBalance(transaction, sellerId, currencyInput.data);
    if (balance.lessThan(amount)) {
      return { success: false as const, error: "Withdrawal amount exceeds your available balance." };
    }

    await transaction.withdrawal.create({
      data: {
        id: withdrawalId,
        sellerId,
        amount,
        currency: currencyInput.data,
      },
    });
    await transaction.ledgerEntry.create({
      data: {
        sellerId,
        type: LedgerEntryType.DEBIT,
        amount,
        currency: currencyInput.data,
        sourceType: LedgerSourceType.WITHDRAWAL,
        sourceId: withdrawalId,
        idempotencyKey: `withdrawal-reserve:${withdrawalId}`,
        description: `Reserved for withdrawal ${withdrawalId}`,
        availableAt: new Date(),
      },
    });
    await transaction.withdrawalEvent.create({
      data: {
        withdrawalId,
        actorId: userId,
        status: WithdrawalStatus.REQUESTED,
      },
    });
    await enqueueUserNotification(transaction, {
      userId,
      type: NotificationType.WITHDRAWAL_UPDATE,
      title: "Withdrawal requested",
      body: `Your withdrawal request for ${amount.toFixed(2)} ${currencyInput.data} was submitted.`,
      eventKey: `withdrawal:${withdrawalId}:${WithdrawalStatus.REQUESTED}`,
      data: { withdrawalId, recipientWorkspace: "SELLER" },
    });
    await transaction.auditLog.create({
      data: {
        actorId: userId,
        action: "withdrawal.requested",
        entityType: "Withdrawal",
        entityId: withdrawalId,
        metadata: { amount: amount.toFixed(2), currency: currencyInput.data },
      },
    });
    return { success: true as const, data: { id: withdrawalId } };
  });

  if (result.success) {
    revalidatePath("/seller/earnings");
    revalidatePath("/admin/finance");
  }
  return result;
}

const commissionRateSchema = z
  .string()
  .regex(/^(?:100(?:\.0{1,2})?|(?:\d|[1-9]\d?)(?:\.\d{1,2})?)$/);

export async function createCommissionRule(
  _previousState: ActionResult<null> | null,
  formData: FormData
): Promise<ActionResult<null>> {
  const authorization = await requirePagePermissions(["commissions.manage"]);
  const rate = commissionRateSchema.safeParse(formData.get("rate"));
  if (!rate.success) {
    return { success: false, error: "Enter a commission rate from 0 to 100 with up to 2 decimals." };
  }

  const basisPoints = Math.round(Number(rate.data) * 100);
  await prisma.$transaction(async (transaction) => {
    const rule = await transaction.commissionRule.create({
      data: { basisPoints, effectiveAt: new Date(), createdById: authorization.user.id },
    });
    await transaction.auditLog.create({
      data: {
        actorId: authorization.user.id,
        action: "commission_rule.created",
        entityType: "CommissionRule",
        entityId: rule.id,
        metadata: { basisPoints, effectiveAt: rule.effectiveAt.toISOString() },
      },
    });
  });
  revalidatePath("/admin/finance");
  return { success: true, data: null };
}

const withdrawalStatusSchema = z.nativeEnum(WithdrawalStatus);
const withdrawalIdSchema = z.string().trim().min(1).max(128);
const providerReferenceSchema = z.string().trim().max(128);

export async function updateWithdrawalStatus(
  _previousState: ActionResult<null> | null,
  formData: FormData
): Promise<ActionResult<null>> {
  const authorization = await requirePagePermissions(["payouts.manage"]);
  const withdrawalId = withdrawalIdSchema.safeParse(formData.get("withdrawalId"));
  const nextStatus = withdrawalStatusSchema.safeParse(formData.get("status"));
  const expectedStatus = withdrawalStatusSchema.safeParse(formData.get("expectedStatus"));
  const providerReference = providerReferenceSchema.safeParse(formData.get("providerReference") ?? "");
  const details = z.string().trim().max(500).safeParse(formData.get("details") ?? "");
  if (
    !withdrawalId.success ||
    !nextStatus.success ||
    !expectedStatus.success ||
    !providerReference.success ||
    !details.success
  ) {
    return { success: false, error: "Invalid withdrawal update." };
  }
  if (nextStatus.data === WithdrawalStatus.PAID && providerReference.data.length === 0) {
    return { success: false, error: "A payout reference is required to record an externally completed payout." };
  }

  const transitions: Partial<Record<WithdrawalStatus, WithdrawalStatus[]>> = {
    [WithdrawalStatus.REQUESTED]: [WithdrawalStatus.APPROVED, WithdrawalStatus.REJECTED],
    [WithdrawalStatus.APPROVED]: [WithdrawalStatus.PROCESSING, WithdrawalStatus.REJECTED],
    [WithdrawalStatus.PROCESSING]: [WithdrawalStatus.PAID, WithdrawalStatus.FAILED],
  };
  if (!transitions[expectedStatus.data]?.includes(nextStatus.data)) {
    return { success: false, error: "That withdrawal status transition is not permitted." };
  }
  const processedStatuses: WithdrawalStatus[] = [
    WithdrawalStatus.PAID,
    WithdrawalStatus.REJECTED,
    WithdrawalStatus.FAILED,
  ];
  const releaseStatuses: WithdrawalStatus[] = [
    WithdrawalStatus.REJECTED,
    WithdrawalStatus.FAILED,
  ];
  const payoutProgressStatuses: WithdrawalStatus[] = [
    WithdrawalStatus.APPROVED,
    WithdrawalStatus.PROCESSING,
  ];
  const withdrawal = await prisma.withdrawal.findUnique({
    where: { id: withdrawalId.data },
    select: {
      id: true,
      sellerId: true,
      status: true,
      amount: true,
      currency: true,
      seller: { select: { userId: true } },
    },
  });
  if (!withdrawal || withdrawal.status !== expectedStatus.data) {
    return { success: false, error: "This withdrawal has changed. Reload and try again." };
  }
  if (
    providerReference.data &&
    (await prisma.withdrawal.findFirst({
      where: { providerReference: providerReference.data, id: { not: withdrawal.id } },
      select: { id: true },
    }))
  ) {
    return { success: false, error: "That payout reference is already recorded." };
  }
  if (payoutProgressStatuses.includes(nextStatus.data)) {
    const disputedEarning = await prisma.ledgerEntry.findFirst({
      where: {
        sellerId: withdrawal.sellerId,
        type: LedgerEntryType.CREDIT,
        sourceType: LedgerSourceType.ORDER,
        orderItem: {
          is: {
            OR: [
              {
                disputes: {
                  some: {
                    OR: [
                      { status: { in: ["OPEN", "UNDER_REVIEW"] } },
                      { decision: { in: ["FULL_REFUND", "PARTIAL_REFUND"] } },
                    ],
                  },
                },
              },
              {
                order: {
                  payments: {
                    some: { status: { in: ["REFUNDED", "PARTIALLY_REFUNDED"] } },
                  },
                },
              },
            ],
          },
        },
      },
      select: { id: true },
    });
    if (disputedEarning) {
      return { success: false, error: "Payout processing is paused while this seller has earnings under dispute or refund." };
    }
  }

  const result = await prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT "id" FROM "SellerProfile" WHERE "id" = ${withdrawal.sellerId} FOR UPDATE`;
    const updated = await transaction.withdrawal.updateMany({
      where: { id: withdrawal.id, status: expectedStatus.data },
      data: {
        status: nextStatus.data,
        providerReference: providerReference.data || undefined,
        processedAt: processedStatuses.includes(nextStatus.data)
          ? new Date()
          : undefined,
      },
    });
    if (updated.count !== 1) return false;

    await transaction.withdrawalEvent.create({
      data: {
        withdrawalId: withdrawal.id,
        actorId: authorization.user.id,
        status: nextStatus.data,
        providerReference: providerReference.data || null,
        details: details.data || null,
      },
    });
    await enqueueUserNotification(transaction, {
      userId: withdrawal.seller.userId,
      type: NotificationType.WITHDRAWAL_UPDATE,
      title: "Withdrawal status updated",
      body: `Your withdrawal status is now ${nextStatus.data.toLowerCase().replaceAll("_", " ")}.`,
      eventKey: `withdrawal:${withdrawal.id}:${nextStatus.data}`,
      data: { withdrawalId: withdrawal.id, recipientWorkspace: "SELLER" },
    });
    if (releaseStatuses.includes(nextStatus.data)) {
      await transaction.ledgerEntry.create({
        data: {
          sellerId: withdrawal.sellerId,
          type: LedgerEntryType.CREDIT,
          amount: withdrawal.amount,
          currency: withdrawal.currency,
          sourceType: LedgerSourceType.ADJUSTMENT,
          sourceId: withdrawal.id,
          idempotencyKey: `withdrawal-release:${withdrawal.id}`,
          description: `Released reserve for ${nextStatus.data.toLowerCase()} withdrawal`,
          availableAt: new Date(),
        },
      });
    }
    await transaction.auditLog.create({
      data: {
        actorId: authorization.user.id,
        action: `withdrawal.${nextStatus.data.toLowerCase()}`,
        entityType: "Withdrawal",
        entityId: withdrawal.id,
        metadata: {
          previousStatus: expectedStatus.data,
          status: nextStatus.data,
          providerReference: providerReference.data || null,
          details: details.data || null,
        },
      },
    });
    return true;
  });
  if (!result) {
    return { success: false, error: "This withdrawal changed. Reload and try again." };
  }
  revalidatePath("/admin/finance");
  revalidatePath("/seller/earnings");
  return { success: true, data: null };
}
