CREATE TYPE "ConversationReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');
CREATE TYPE "ConversationReportReason" AS ENUM ('ABUSE', 'HARASSMENT', 'SPAM', 'FRAUD', 'OTHER');

DROP INDEX "Conversation_orderId_key";
CREATE UNIQUE INDEX "Conversation_orderId_sellerId_key"
ON "Conversation"("orderId", "sellerId")
WHERE "orderId" IS NOT NULL;
CREATE INDEX "Conversation_orderId_idx" ON "Conversation"("orderId");

CREATE TABLE "ConversationReport" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" "ConversationReportReason" NOT NULL,
    "details" TEXT,
    "status" "ConversationReportStatus" NOT NULL DEFAULT 'OPEN',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConversationReport_conversationId_reporterId_key"
ON "ConversationReport"("conversationId", "reporterId");
CREATE INDEX "ConversationReport_status_createdAt_idx"
ON "ConversationReport"("status", "createdAt");
CREATE INDEX "ConversationReport_reporterId_createdAt_idx"
ON "ConversationReport"("reporterId", "createdAt");

ALTER TABLE "ConversationReport"
ADD CONSTRAINT "ConversationReport_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConversationReport"
ADD CONSTRAINT "ConversationReport_reporterId_fkey"
FOREIGN KEY ("reporterId") REFERENCES "user"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ConversationReport"
ADD CONSTRAINT "ConversationReport_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "user"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
