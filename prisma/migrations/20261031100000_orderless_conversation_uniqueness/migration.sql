BEGIN;

LOCK TABLE "Conversation" IN ACCESS EXCLUSIVE MODE;

WITH ranked AS (
  SELECT
    "id",
    FIRST_VALUE("id") OVER (
      PARTITION BY "buyerId", "sellerId"
      ORDER BY "createdAt", "id"
    ) AS canonical_id,
    ROW_NUMBER() OVER (
      PARTITION BY "buyerId", "sellerId"
      ORDER BY "createdAt", "id"
    ) AS thread_rank
  FROM "Conversation"
  WHERE "orderId" IS NULL
)
UPDATE "Message" AS message
SET "conversationId" = ranked.canonical_id
FROM ranked
WHERE message."conversationId" = ranked."id"
  AND ranked.thread_rank > 1;

WITH canonical_timestamps AS (
  SELECT
    FIRST_VALUE("id") OVER (
      PARTITION BY "buyerId", "sellerId"
      ORDER BY "createdAt", "id"
    ) AS canonical_id,
    MAX("updatedAt") OVER (
      PARTITION BY "buyerId", "sellerId"
    ) AS latest_updated_at,
    ROW_NUMBER() OVER (
      PARTITION BY "buyerId", "sellerId"
      ORDER BY "createdAt", "id"
    ) AS thread_rank
  FROM "Conversation"
  WHERE "orderId" IS NULL
)
UPDATE "Conversation" AS conversation
SET "updatedAt" = canonical_timestamps.latest_updated_at
FROM canonical_timestamps
WHERE conversation."id" = canonical_timestamps.canonical_id
  AND canonical_timestamps.thread_rank = 1;

WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "buyerId", "sellerId"
      ORDER BY "createdAt", "id"
    ) AS thread_rank
  FROM "Conversation"
  WHERE "orderId" IS NULL
)
DELETE FROM "Conversation" AS conversation
USING ranked
WHERE conversation."id" = ranked."id"
  AND ranked.thread_rank > 1;

CREATE UNIQUE INDEX "Conversation_orderless_buyerId_sellerId_key"
ON "Conversation" ("buyerId", "sellerId")
WHERE "orderId" IS NULL;

COMMIT;
