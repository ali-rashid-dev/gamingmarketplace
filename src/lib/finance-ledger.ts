import {
  DisputeDecision,
  DisputeStatus,
  LedgerEntryType,
  LedgerSourceType,
  OrderItemStatus,
  OrderStatus,
  PaymentStatus,
} from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";

type FinanceTransaction = Prisma.TransactionClient;

const payableOrderStatuses: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.COMPLETED,
];
const activeDisputeStatuses: DisputeStatus[] = [
  DisputeStatus.OPEN,
  DisputeStatus.UNDER_REVIEW,
];
const refundDecisions: DisputeDecision[] = [
  DisputeDecision.FULL_REFUND,
  DisputeDecision.PARTIAL_REFUND,
];
const refundedPaymentStatuses: PaymentStatus[] = [
  PaymentStatus.REFUNDED,
  PaymentStatus.PARTIALLY_REFUNDED,
];

export class FinanceLedgerError extends Error {}

export async function postSettledSellerEarning(
  transaction: FinanceTransaction,
  orderItemId: string
) {
  const existing = await transaction.sellerCommission.findUnique({
    where: { orderItemId },
  });
  if (existing) return existing;

  const item = await transaction.orderItem.findUnique({
    where: { id: orderItemId },
    include: {
      order: {
        include: {
          payments: {
            select: {
              amount: true,
              currency: true,
              status: true,
              settledAt: true,
              providerSettlementReference: true,
            },
          },
        },
      },
      disputes: { select: { id: true, status: true, decision: true } },
    },
  });
  if (
    !item ||
    item.status !== OrderItemStatus.COMPLETED ||
    !payableOrderStatuses.includes(item.order.status) ||
    item.disputes.some((dispute) =>
      activeDisputeStatuses.includes(dispute.status) ||
      (dispute.decision !== null && refundDecisions.includes(dispute.decision))
    ) ||
    item.currency !== item.order.currency ||
    item.order.payments.some((payment) => refundedPaymentStatuses.includes(payment.status))
  ) {
    throw new FinanceLedgerError("This order item is not eligible for seller earnings.");
  }

  const settledAmount = item.order.payments
    .filter((payment) =>
      payment.status === PaymentStatus.SUCCEEDED &&
      payment.settledAt !== null &&
      payment.providerSettlementReference !== null &&
      payment.currency === item.order.currency
    )
    .reduce((sum, payment) => sum.add(payment.amount), new Prisma.Decimal(0));
  if (settledAmount.lessThan(item.order.total)) {
    throw new FinanceLedgerError("The order does not have confirmed, fully settled payment.");
  }

  const rule = await transaction.commissionRule.findFirst({
    where: { effectiveAt: { lte: new Date() } },
    orderBy: [{ effectiveAt: "desc" }, { createdAt: "desc" }],
  });
  if (!rule) {
    throw new FinanceLedgerError("Configure a commission rate before posting seller earnings.");
  }

  const grossAmount = item.totalPrice;
  const commissionAmount = grossAmount
    .mul(rule.basisPoints)
    .div(10_000)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  const sellerNet = grossAmount.sub(commissionAmount);
  const commission = await transaction.sellerCommission.create({
    data: {
      orderItemId: item.id,
      sellerId: item.sellerId,
      commissionRuleId: rule.id,
      grossAmount,
      commissionAmount,
      sellerNet,
      currency: item.currency,
    },
  });

  if (sellerNet.greaterThan(0)) {
    await transaction.ledgerEntry.create({
      data: {
        sellerId: item.sellerId,
        type: LedgerEntryType.CREDIT,
        amount: sellerNet,
        currency: item.currency,
        sourceType: LedgerSourceType.ORDER,
        sourceId: item.id,
        orderItemId: item.id,
        idempotencyKey: `settled-order-item:${item.id}`,
        description: `Settled seller earnings for order ${item.order.orderNumber}`,
        availableAt: new Date(),
      },
    });
  }

  return commission;
}

export async function getAvailableSellerBalance(
  transaction: FinanceTransaction,
  sellerId: string,
  currency: string
) {
  const now = new Date();
  const [entries, disputedItems] = await Promise.all([
    transaction.ledgerEntry.groupBy({
      by: ["type"],
      where: { sellerId, currency, availableAt: { lte: now } },
      _sum: { amount: true },
    }),
    transaction.orderItem.findMany({
      where: {
        sellerId,
        OR: [
          {
            disputes: {
              some: {
                OR: [
                  { status: { in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] } },
                  { decision: { in: [DisputeDecision.FULL_REFUND, DisputeDecision.PARTIAL_REFUND] } },
                ],
              },
            },
          },
          {
            order: {
              payments: {
                some: { status: { in: [PaymentStatus.REFUNDED, PaymentStatus.PARTIALLY_REFUNDED] } },
              },
            },
          },
        ],
        ledgerEntries: {
          some: {
            sellerId,
            currency,
            type: LedgerEntryType.CREDIT,
            availableAt: { lte: now },
          },
        },
      },
      select: {
        ledgerEntries: {
          where: {
            sellerId,
            currency,
            type: LedgerEntryType.CREDIT,
            availableAt: { lte: now },
          },
          select: { amount: true },
        },
      },
    }),
  ]);
  const credits = entries.find((entry) => entry.type === LedgerEntryType.CREDIT)?._sum.amount ?? new Prisma.Decimal(0);
  const debits = entries.find((entry) => entry.type === LedgerEntryType.DEBIT)?._sum.amount ?? new Prisma.Decimal(0);
  const disputedCredits = disputedItems.reduce(
    (sum, item) => sum.add(item.ledgerEntries.reduce((itemSum, entry) => itemSum.add(entry.amount), new Prisma.Decimal(0))),
    new Prisma.Decimal(0)
  );
  return Prisma.Decimal.max(credits.sub(debits).sub(disputedCredits), 0);
}
