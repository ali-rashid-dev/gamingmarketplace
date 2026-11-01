ALTER TABLE "Listing" DROP COLUMN "searchVector";

ALTER TABLE "Listing"
ADD COLUMN "searchVector" tsvector
GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("description", ''))
) STORED;

CREATE INDEX "Listing_searchVector_idx" ON "Listing" USING GIN ("searchVector");
