"use server";

import { requirePagePermissions } from "@/lib/authorization";
import { FinanceLedgerError, postSettledSellerEarning } from "@/lib/finance-ledger";
import type { ActionResult } from "@/lib/action-result";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function postSettledEarning(
  _previousState: ActionResult<null> | null,
  formData: FormData
): Promise<ActionResult<null>> {
  const authorization = await requirePagePermissions(["commissions.manage"]);
  const orderItemId = z.string().trim().min(1).max(128).safeParse(formData.get("orderItemId"));
  if (!orderItemId.success) {
    return { success: false, error: "Select a valid order item." };
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const item = await transaction.orderItem.findUnique({
        where: { id: orderItemId.data },
        select: { sellerId: true },
      });
      if (!item) throw new FinanceLedgerError("Order item not found.");
      await transaction.$queryRaw`SELECT "id" FROM "SellerProfile" WHERE "id" = ${item.sellerId} FOR UPDATE`;
      if (await transaction.sellerCommission.findUnique({ where: { orderItemId: orderItemId.data } })) {
        throw new FinanceLedgerError("Seller earnings for this order item were already posted.");
      }

      const commission = await postSettledSellerEarning(transaction, orderItemId.data);
      await transaction.auditLog.create({
        data: {
          actorId: authorization.user.id,
          action: "seller_earning.posted",
          entityType: "SellerCommission",
          entityId: commission.id,
          metadata: {
            orderItemId: orderItemId.data,
            sellerNet: commission.sellerNet.toString(),
            commissionAmount: commission.commissionAmount.toString(),
            currency: commission.currency,
          },
        },
      });
    });
  } catch (error) {
    if (error instanceof FinanceLedgerError) {
      return { success: false, error: error.message };
    }
    throw error;
  }
  revalidatePath("/admin/finance");
  revalidatePath("/seller/earnings");
  revalidatePath("/seller");
  return { success: true, data: null };
}
