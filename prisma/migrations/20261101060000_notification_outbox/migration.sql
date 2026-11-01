ALTER TYPE "NotificationType" ADD VALUE 'DELIVERY_UPDATE';
ALTER TYPE "NotificationType" ADD VALUE 'WITHDRAWAL_UPDATE';
ALTER TYPE "NotificationType" ADD VALUE 'SUPPORT_UPDATE';

CREATE TYPE "NotificationOutboxStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'SENT',
    'SKIPPED',
    'DEAD'
);

ALTER TABLE "Notification"
ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "Notification_idempotencyKey_key"
ON "Notification"("idempotencyKey");

CREATE TABLE "NotificationOutbox" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "status" "NotificationOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationOutbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationOutbox_notificationId_key"
ON "NotificationOutbox"("notificationId");
CREATE UNIQUE INDEX "NotificationOutbox_dedupeKey_key"
ON "NotificationOutbox"("dedupeKey");
CREATE INDEX "NotificationOutbox_status_availableAt_lockedAt_idx"
ON "NotificationOutbox"("status", "availableAt", "lockedAt");
CREATE INDEX "NotificationOutbox_userId_createdAt_idx"
ON "NotificationOutbox"("userId", "createdAt");

ALTER TABLE "NotificationOutbox"
ADD CONSTRAINT "NotificationOutbox_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "user"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationOutbox"
ADD CONSTRAINT "NotificationOutbox_notificationId_fkey"
FOREIGN KEY ("notificationId") REFERENCES "Notification"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
