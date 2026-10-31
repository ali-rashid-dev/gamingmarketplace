CREATE TYPE "ReviewStatus" AS ENUM ('PUBLISHED', 'HIDDEN');
CREATE TYPE "ReviewReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');
CREATE TYPE "ReviewReportReason" AS ENUM ('ABUSE', 'HARASSMENT', 'SPAM', 'FRAUD', 'OTHER');

ALTER TABLE "Review"
ADD COLUMN "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
ADD COLUMN "sellerResponse" TEXT,
ADD COLUMN "sellerRespondedAt" TIMESTAMP(3);

DROP INDEX IF EXISTS "Review_sellerId_createdAt_idx";
CREATE INDEX "Review_sellerId_status_createdAt_idx"
ON "Review"("sellerId", "status", "createdAt");

CREATE TABLE "ReviewReport" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" "ReviewReportReason" NOT NULL,
    "details" TEXT,
    "status" "ReviewReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReviewReport_reviewId_reporterId_key"
ON "ReviewReport"("reviewId", "reporterId");
CREATE INDEX "ReviewReport_status_createdAt_idx"
ON "ReviewReport"("status", "createdAt");
CREATE INDEX "ReviewReport_reporterId_createdAt_idx"
ON "ReviewReport"("reporterId", "createdAt");

ALTER TABLE "ReviewReport"
ADD CONSTRAINT "ReviewReport_reviewId_fkey"
FOREIGN KEY ("reviewId") REFERENCES "Review"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReviewReport"
ADD CONSTRAINT "ReviewReport_reporterId_fkey"
FOREIGN KEY ("reporterId") REFERENCES "user"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
