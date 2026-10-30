CREATE TYPE "DeliveryType" AS ENUM ('INSTANT', 'MANUAL');

ALTER TYPE "ListingStatus" ADD VALUE 'PENDING_REVIEW';

ALTER TABLE "Listing"
ADD COLUMN "platform" TEXT,
ADD COLUMN "region" TEXT,
ADD COLUMN "deliveryType" "DeliveryType" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "deliveryEstimate" TEXT,
ADD COLUMN "expiresAt" TIMESTAMP(3),
ADD COLUMN "reviewNote" TEXT;

CREATE INDEX "Listing_status_expiresAt_idx" ON "Listing"("status", "expiresAt");

CREATE TABLE "ListingRevision" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "changedById" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingRevision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ListingRevision_listingId_revisionNumber_idx" ON "ListingRevision"("listingId", "revisionNumber");
CREATE INDEX "ListingRevision_changedById_createdAt_idx" ON "ListingRevision"("changedById", "createdAt");

ALTER TABLE "ListingRevision" ADD CONSTRAINT "ListingRevision_listingId_fkey"
FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ListingRevision" ADD CONSTRAINT "ListingRevision_changedById_fkey"
FOREIGN KEY ("changedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
