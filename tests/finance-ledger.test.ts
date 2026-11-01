import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@/generated/prisma/client";
import { calculateSellerCommission, FinanceLedgerError } from "@/lib/finance-ledger";

test("commission uses half-up currency rounding and reconciles seller net", () => {
  const { commissionAmount, sellerNet } = calculateSellerCommission(
    new Prisma.Decimal("123.45"),
    1_000
  );

  assert.equal(commissionAmount.toFixed(2), "12.35");
  assert.equal(sellerNet.toFixed(2), "111.10");
  assert.equal(commissionAmount.add(sellerNet).toFixed(2), "123.45");
});

test("commission allows zero basis points and rejects invalid inputs", () => {
  assert.equal(
    calculateSellerCommission(new Prisma.Decimal("10.00"), 0).commissionAmount.toFixed(2),
    "0.00"
  );
  assert.throws(
    () => calculateSellerCommission(new Prisma.Decimal("10.00"), 10_001),
    FinanceLedgerError
  );
  assert.throws(
    () => calculateSellerCommission(new Prisma.Decimal("-0.01"), 100),
    FinanceLedgerError
  );
  assert.throws(
    () => calculateSellerCommission(new Prisma.Decimal("10.00"), 1.5),
    FinanceLedgerError
  );
  assert.throws(
    () => calculateSellerCommission(new Prisma.Decimal(NaN), 100),
    FinanceLedgerError
  );
  assert.throws(
    () => calculateSellerCommission(new Prisma.Decimal(Infinity), 100),
    FinanceLedgerError
  );
});
