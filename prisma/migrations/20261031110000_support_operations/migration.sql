CREATE TYPE "SupportTicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "SupportReportCategory" AS ENUM (
    'ABUSE',
    'SCAM',
    'HARASSMENT',
    'SUSPICIOUS_ACTIVITY',
    'OTHER'
);
CREATE TYPE "SupportReportStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED');

ALTER TABLE "SupportTicket"
ADD COLUMN "assignedToId" TEXT,
ADD COLUMN "priority" "SupportTicketPriority" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN "resolvedAt" TIMESTAMP(3);

UPDATE "SupportTicket"
SET "resolvedAt" = "updatedAt"
WHERE "status" IN ('RESOLVED', 'CLOSED');

ALTER TABLE "SupportTicketMessage"
ADD COLUMN "isInternal" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "SupportTicket_assignedToId_status_updatedAt_idx"
ON "SupportTicket"("assignedToId", "status", "updatedAt");
CREATE INDEX "SupportTicket_status_priority_updatedAt_idx"
ON "SupportTicket"("status", "priority", "updatedAt");

ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assignedToId_fkey"
FOREIGN KEY ("assignedToId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "SupportAgentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupportAgentProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupportAgentProfile_userId_key"
ON "SupportAgentProfile"("userId");

ALTER TABLE "SupportAgentProfile" ADD CONSTRAINT "SupportAgentProfile_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SupportReport" (
    "id" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "reportedUserId" TEXT,
    "assignedToId" TEXT,
    "orderId" TEXT,
    "category" "SupportReportCategory" NOT NULL,
    "status" "SupportReportStatus" NOT NULL DEFAULT 'OPEN',
    "details" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupportReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupportReport_status_createdAt_idx"
ON "SupportReport"("status", "createdAt");
CREATE INDEX "SupportReport_reportedUserId_createdAt_idx"
ON "SupportReport"("reportedUserId", "createdAt");
CREATE INDEX "SupportReport_assignedToId_status_updatedAt_idx"
ON "SupportReport"("assignedToId", "status", "updatedAt");

ALTER TABLE "SupportReport" ADD CONSTRAINT "SupportReport_submittedById_fkey"
FOREIGN KEY ("submittedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportReport" ADD CONSTRAINT "SupportReport_reportedUserId_fkey"
FOREIGN KEY ("reportedUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportReport" ADD CONSTRAINT "SupportReport_assignedToId_fkey"
FOREIGN KEY ("assignedToId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportReport" ADD CONSTRAINT "SupportReport_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
