ALTER TABLE "Payment"
ADD COLUMN "settledAt" TIMESTAMP(3),
ADD COLUMN "providerSettlementReference" TEXT;

CREATE UNIQUE INDEX "Payment_providerSettlementReference_key"
ON "Payment"("providerSettlementReference");
CREATE UNIQUE INDEX "Withdrawal_providerReference_key"
ON "Withdrawal"("providerReference");

ALTER TABLE "LedgerEntry"
ADD COLUMN "availableAt" TIMESTAMP(3),
ADD COLUMN "orderItemId" TEXT,
ADD COLUMN "idempotencyKey" TEXT NOT NULL DEFAULT gen_random_uuid()::text;
ALTER TABLE "LedgerEntry" ALTER COLUMN "idempotencyKey" DROP DEFAULT;

CREATE UNIQUE INDEX "LedgerEntry_idempotencyKey_key"
ON "LedgerEntry"("idempotencyKey");
CREATE INDEX "LedgerEntry_sellerId_currency_availableAt_idx"
ON "LedgerEntry"("sellerId", "currency", "availableAt");
CREATE INDEX "LedgerEntry_orderItemId_idx" ON "LedgerEntry"("orderItemId");
ALTER TABLE "LedgerEntry"
ADD CONSTRAINT "LedgerEntry_orderItemId_fkey"
FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LedgerEntry"
ADD CONSTRAINT "LedgerEntry_amount_positive_check" CHECK ("amount" > 0);

CREATE TABLE "CommissionRule" (
    "id" TEXT NOT NULL,
    "basisPoints" INTEGER NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CommissionRule_basisPoints_check" CHECK ("basisPoints" BETWEEN 0 AND 10000)
);

CREATE INDEX "CommissionRule_effectiveAt_idx" ON "CommissionRule"("effectiveAt");

ALTER TABLE "CommissionRule"
ADD CONSTRAINT "CommissionRule_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "user"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "SellerCommission" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "commissionRuleId" TEXT NOT NULL,
    "grossAmount" DECIMAL(12,2) NOT NULL,
    "commissionAmount" DECIMAL(12,2) NOT NULL,
    "sellerNet" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SellerCommission_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SellerCommission_amounts_nonnegative_check"
      CHECK ("grossAmount" >= 0 AND "commissionAmount" >= 0 AND "sellerNet" >= 0),
    CONSTRAINT "SellerCommission_amounts_balance_check"
      CHECK ("grossAmount" = "commissionAmount" + "sellerNet")
);

CREATE UNIQUE INDEX "SellerCommission_orderItemId_key" ON "SellerCommission"("orderItemId");
CREATE INDEX "SellerCommission_sellerId_createdAt_idx" ON "SellerCommission"("sellerId", "createdAt");
CREATE INDEX "SellerCommission_currency_createdAt_idx" ON "SellerCommission"("currency", "createdAt");

ALTER TABLE "SellerCommission"
ADD CONSTRAINT "SellerCommission_orderItemId_fkey"
FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SellerCommission"
ADD CONSTRAINT "SellerCommission_sellerId_fkey"
FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SellerCommission"
ADD CONSTRAINT "SellerCommission_commissionRuleId_fkey"
FOREIGN KEY ("commissionRuleId") REFERENCES "CommissionRule"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "WithdrawalEvent" (
    "id" TEXT NOT NULL,
    "withdrawalId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "status" "WithdrawalStatus" NOT NULL,
    "providerReference" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WithdrawalEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WithdrawalEvent_withdrawalId_createdAt_idx" ON "WithdrawalEvent"("withdrawalId", "createdAt");
CREATE INDEX "WithdrawalEvent_actorId_createdAt_idx" ON "WithdrawalEvent"("actorId", "createdAt");

ALTER TABLE "WithdrawalEvent"
ADD CONSTRAINT "WithdrawalEvent_withdrawalId_fkey"
FOREIGN KEY ("withdrawalId") REFERENCES "Withdrawal"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WithdrawalEvent"
ADD CONSTRAINT "WithdrawalEvent_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "user"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_financial_record_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'Financial history is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "LedgerEntry_append_only"
BEFORE UPDATE OR DELETE ON "LedgerEntry"
FOR EACH ROW EXECUTE FUNCTION prevent_financial_record_mutation();
CREATE TRIGGER "SellerCommission_append_only"
BEFORE UPDATE OR DELETE ON "SellerCommission"
FOR EACH ROW EXECUTE FUNCTION prevent_financial_record_mutation();
CREATE TRIGGER "WithdrawalEvent_append_only"
BEFORE UPDATE OR DELETE ON "WithdrawalEvent"
FOR EACH ROW EXECUTE FUNCTION prevent_financial_record_mutation();
CREATE TRIGGER "CommissionRule_append_only"
BEFORE UPDATE OR DELETE ON "CommissionRule"
FOR EACH ROW EXECUTE FUNCTION prevent_financial_record_mutation();
