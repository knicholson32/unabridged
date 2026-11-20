-- Audiobookshelf IDs. Both are caches, rematched by ASIN or folder path when they go stale.
-- AlterTable
ALTER TABLE "books" ADD COLUMN "absItemId" TEXT;

-- AlterTable
ALTER TABLE "series" ADD COLUMN "absSeriesId" TEXT;

