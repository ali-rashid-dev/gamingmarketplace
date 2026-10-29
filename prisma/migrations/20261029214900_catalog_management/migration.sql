-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CategoryFieldType" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'SELECT', 'MULTI_SELECT');

-- Migrate existing active games to the equivalent published state.
ALTER TABLE "Game" ADD COLUMN "status" "GameStatus" NOT NULL DEFAULT 'DRAFT';
UPDATE "Game" SET "status" = CASE WHEN "isActive" THEN 'PUBLISHED'::"GameStatus" ELSE 'ARCHIVED'::"GameStatus" END;
ALTER TABLE "Game" DROP COLUMN "isActive";
ALTER TABLE "Game" ADD COLUMN "logoUrl" TEXT,
ADD COLUMN "coverImageUrl" TEXT,
ADD COLUMN "seoTitle" TEXT,
ADD COLUMN "seoDescription" TEXT;
DROP INDEX IF EXISTS "Game_isActive_name_idx";
CREATE INDEX "Game_status_name_idx" ON "Game"("status", "name");

-- Category types are intentionally open-ended so product types can be added without migrations.
ALTER TABLE "Category" ALTER COLUMN "type" TYPE TEXT USING "type"::TEXT;
ALTER TABLE "Category" ADD COLUMN "platforms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
DROP TYPE "CategoryType";

-- CreateTable
CREATE TABLE "CategoryField" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "CategoryFieldType" NOT NULL DEFAULT 'TEXT',
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryField_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoryField_categoryId_key_key" ON "CategoryField"("categoryId", "key");

-- CreateIndex
CREATE INDEX "CategoryField_categoryId_sortOrder_idx" ON "CategoryField"("categoryId", "sortOrder");

-- AddForeignKey
ALTER TABLE "CategoryField" ADD CONSTRAINT "CategoryField_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
