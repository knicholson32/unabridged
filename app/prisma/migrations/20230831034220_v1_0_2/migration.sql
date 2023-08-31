/*
  Warnings:

  - You are about to alter the column `size_b` on the `media` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to drop the column `ref_id` on the `processQueue` table. All the data in the column will be lost.
  - Added the required column `bookAsin` to the `processQueue` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookAsin" TEXT NOT NULL,
    "data" BLOB,
    "is_file" BOOLEAN NOT NULL,
    "path" TEXT,
    "content_type" TEXT NOT NULL,
    "description" TEXT,
    "extension" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "size_b" BIGINT NOT NULL,
    CONSTRAINT "media_bookAsin_fkey" FOREIGN KEY ("bookAsin") REFERENCES "books" ("asin") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_media" ("bookAsin", "content_type", "data", "description", "extension", "id", "is_file", "path", "size_b", "title") SELECT "bookAsin", "content_type", "data", "description", "extension", "id", "is_file", "path", "size_b", "title" FROM "media";
DROP TABLE "media";
ALTER TABLE "new_media" RENAME TO "media";
CREATE TABLE "new_processQueue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookAsin" TEXT NOT NULL,
    "in_progress" BOOLEAN NOT NULL DEFAULT false,
    "try_after_time" BIGINT,
    CONSTRAINT "processQueue_bookAsin_fkey" FOREIGN KEY ("bookAsin") REFERENCES "books" ("asin") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_processQueue" ("id") SELECT "id" FROM "processQueue";
DROP TABLE "processQueue";
ALTER TABLE "new_processQueue" RENAME TO "processQueue";
CREATE UNIQUE INDEX "processQueue_bookAsin_key" ON "processQueue"("bookAsin");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
