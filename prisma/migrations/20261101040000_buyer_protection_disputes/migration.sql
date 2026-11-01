CREATE TYPE "DisputeReasonCode" AS ENUM (
    'NOT_DELIVERED',
    'INVALID_GOODS',
    'NOT_AS_DESCRIBED',
    'OTHER'
);

CREATE TYPE "DisputeDecision" AS ENUM (
    'FULL_REFUND',
    'PARTIAL_REFUND',
    'RELEASE_TO_SELLER',
    'NO_FINANCIAL_ADJUSTMENT',
    'OTHER'
);

CREATE TYPE "DisputeEventType" AS ENUM (
    'OPENED',
    'MESSAGE',
    'EVIDENCE_ADDED',
    'ASSIGNED',
    'EVIDENCE_REQUESTED',
    'ESCALATED',
    'DECIDED',
    'APPEALED'
);

ALTER TABLE "Dispute"
ADD COLUMN "assignedToId" TEXT,
ADD COLUMN "reasonCode" "DisputeReasonCode" NOT NULL DEFAULT 'OTHER',
ADD COLUMN "decision" "DisputeDecision",
ADD COLUMN "decisionAmount" DECIMAL(12,2),
ADD COLUMN "appealedAt" TIMESTAMP(3);

CREATE INDEX "Dispute_assignedToId_status_updatedAt_idx"
ON "Dispute"("assignedToId", "status", "updatedAt");
CREATE INDEX "Dispute_orderItemId_status_idx"
ON "Dispute"("orderItemId", "status");

CREATE UNIQUE INDEX "Dispute_active_orderItemId_key"
ON "Dispute"("orderItemId")
WHERE "orderItemId" IS NOT NULL AND "status" IN ('OPEN', 'UNDER_REVIEW');

ALTER TABLE "Dispute"
ADD CONSTRAINT "Dispute_assignedToId_fkey"
FOREIGN KEY ("assignedToId") REFERENCES "user"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "DisputeMessage" (
    "id" TEXT NOT NULL,
    "disputeId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DisputeMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DisputeMessage_disputeId_createdAt_idx"
ON "DisputeMessage"("disputeId", "createdAt");
CREATE INDEX "DisputeMessage_senderId_createdAt_idx"
ON "DisputeMessage"("senderId", "createdAt");

ALTER TABLE "DisputeMessage"
ADD CONSTRAINT "DisputeMessage_disputeId_fkey"
FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DisputeMessage"
ADD CONSTRAINT "DisputeMessage_senderId_fkey"
FOREIGN KEY ("senderId") REFERENCES "user"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "DisputeEvent" (
    "id" TEXT NOT NULL,
    "disputeId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "type" "DisputeEventType" NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DisputeEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DisputeEvent_disputeId_createdAt_idx"
ON "DisputeEvent"("disputeId", "createdAt");

ALTER TABLE "DisputeEvent"
ADD CONSTRAINT "DisputeEvent_disputeId_fkey"
FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DisputeEvent"
ADD CONSTRAINT "DisputeEvent_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "user"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DisputeEvidence"
ADD COLUMN "name" TEXT,
ADD COLUMN "contentType" TEXT,
ADD COLUMN "size" INTEGER;
