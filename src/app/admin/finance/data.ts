import {
  DisputeDecision,
  DisputeStatus,
  LedgerEntryType,
  LedgerSourceType,
  OrderItemStatus,
  OrderStatus,
  PaymentStatus,
  WithdrawalStatus,
} from "@/generated/prisma/enums";
import { requirePagePermissions } from "@/lib/authorization";
import { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";

export async function getFinanceDashboard() {
  await requirePagePermissions(["commissions.manage", "payouts.manage"]);
  const now = new Date();
  const [
    rules,
    commissionTotals,
    ledgerEarningTotals,
    ledgerTotals,
    disputedLedgerTotals,
    payoutTotals,
    withdrawals,
    candidateItems,
    settledPaymentCount,
  ] = await Promise.all([
    prisma.commissionRule.findMany({
      orderBy: [{ effectiveAt: "desc" }, { createdAt: "desc" }],
      take: 10,
      select: {
        id: true,
        basisPoints: true,
        effectiveAt: true,
        createdAt: true,
        createdBy: { select: { name: true, email: true } },
      },
    }),
    prisma.sellerCommission.groupBy({
      by: ["currency"],
      _sum: { grossAmount: true, commissionAmount: true, sellerNet: true },
    }),
    prisma.ledgerEntry.groupBy({
      by: ["currency"],
      where: {
        type: LedgerEntryType.CREDIT,
        sourceType: LedgerSourceType.ORDER,
        availableAt: { lte: now },
      },
      _sum: { amount: true },
    }),
    prisma.ledgerEntry.groupBy({
      by: ["currency", "type"],
      where: { availableAt: { lte: now } },
      _sum: { amount: true },
    }),
    prisma.ledgerEntry.groupBy({
      by: ["currency"],
      where: {
        type: LedgerEntryType.CREDIT,
        availableAt: { lte: now },
        orderItem: {
          is: {
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
          },
        },
      },
      _sum: { amount: true },
    }),
    prisma.withdrawal.groupBy({
      by: ["currency", "status"],
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.withdrawal.findMany({
      where: {
        status: {
          in: [WithdrawalStatus.REQUESTED, WithdrawalStatus.APPROVED, WithdrawalStatus.PROCESSING],
        },
      },
      orderBy: [{ requestedAt: "asc" }, { id: "asc" }],
      take: 100,
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        requestedAt: true,
        seller: { select: { shopName: true } },
        events: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 1,
          select: { details: true, createdAt: true },
        },
      },
    }),
    prisma.orderItem.findMany({
      where: {
        status: OrderItemStatus.COMPLETED,
        commission: null,
        order: {
          status: { in: [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.COMPLETED] },
          payments: {
            some: {
              status: PaymentStatus.SUCCEEDED,
              settledAt: { not: null },
              providerSettlementReference: { not: null },
            },
            none: {
              status: { in: [PaymentStatus.REFUNDED, PaymentStatus.PARTIALLY_REFUNDED] },
            },
          },
        },
        disputes: {
          none: {
            OR: [
              { status: { in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] } },
              { decision: { in: [DisputeDecision.FULL_REFUND, DisputeDecision.PARTIAL_REFUND] } },
            ],
          },
        },
      },
      orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
      take: 100,
      select: {
        id: true,
        listingTitle: true,
        totalPrice: true,
        currency: true,
        order: {
          select: {
            orderNumber: true,
            total: true,
            currency: true,
            payments: {
              where: {
                status: PaymentStatus.SUCCEEDED,
                settledAt: { not: null },
                providerSettlementReference: { not: null },
              },
              select: { amount: true, currency: true },
            },
          },
        },
        seller: { select: { shopName: true } },
      },
    }),
    prisma.payment.count({
      where: {
        status: PaymentStatus.SUCCEEDED,
        settledAt: { not: null },
        providerSettlementReference: { not: null },
      },
    }),
  ]);
  const unreconciledItems = candidateItems
    .filter((item) => {
      if (item.currency !== item.order.currency) return false;
      const settled = item.order.payments
        .filter((payment) => payment.currency === item.order.currency)
        .reduce((sum, payment) => sum.add(payment.amount), new Prisma.Decimal(0));
      return settled.greaterThanOrEqualTo(item.order.total);
    })
    .map((item) => ({
      ...item,
      totalPrice: item.totalPrice.toFixed(2),
    }));
  const balances = new Set([
    ...commissionTotals.map((item) => item.currency),
    ...ledgerEarningTotals.map((item) => item.currency),
    ...ledgerTotals.map((item) => item.currency),
    ...disputedLedgerTotals.map((item) => item.currency),
  ]);
  return {
    rules: rules.map((rule) => ({
      ...rule,
      rate: (rule.basisPoints / 100).toFixed(2),
    })),
    commissionTotals: commissionTotals.map((item) => ({
      currency: item.currency,
      gross: item._sum.grossAmount?.toFixed(2) ?? "0.00",
      commission: item._sum.commissionAmount?.toFixed(2) ?? "0.00",
      sellerNet: item._sum.sellerNet?.toFixed(2) ?? "0.00",
      ledgerEarnings:
        ledgerEarningTotals.find((ledger) => ledger.currency === item.currency)?._sum.amount?.toFixed(2) ??
        "0.00",
      reconciliationDelta: (
        (ledgerEarningTotals.find((ledger) => ledger.currency === item.currency)?._sum.amount ??
          new Prisma.Decimal(0)).sub(item._sum.sellerNet ?? 0)
      ).toFixed(2),
    })),
    balances: Array.from(balances).map((currency) => {
      const entries = ledgerTotals.filter((entry) => entry.currency === currency);
      const credits = entries
        .filter((entry) => entry.type === LedgerEntryType.CREDIT)
        .reduce((sum, entry) => sum.add(entry._sum.amount ?? 0), new Prisma.Decimal(0));
      const debits = entries
        .filter((entry) => entry.type === LedgerEntryType.DEBIT)
        .reduce((sum, entry) => sum.add(entry._sum.amount ?? 0), new Prisma.Decimal(0));
      const disputedCredits = disputedLedgerTotals.find((entry) => entry.currency === currency)?._sum.amount ?? new Prisma.Decimal(0);
      return {
        currency,
        available: Prisma.Decimal.max(credits.sub(debits).sub(disputedCredits), 0).toFixed(2),
      };
    }),
    withdrawals,
    payoutTotals: payoutTotals.map((item) => ({
      currency: item.currency,
      status: item.status,
      amount: item._sum.amount?.toFixed(2) ?? "0.00",
      count: item._count._all,
    })),
    unreconciledItems,
    settledPaymentCount,
  };
}
