/*
  Warnings:

  - You are about to drop the `Progress` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `bookAsin` on the `processQueue` table. All the data in the column will be lost.
  - You are about to drop the column `download_progress` on the `processQueue` table. All the data in the column will be lost.
  - You are about to drop the column `downloaded_mb` on the `processQueue` table. All the data in the column will be lost.
  - You are about to drop the column `process_progress` on the `processQueue` table. All the data in the column will be lost.
  - You are about to drop the column `speed` on the `processQueue` table. All the data in the column will be lost.
  - You are about to drop the column `total_mb` on the `processQueue` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "processBook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookAsin" TEXT NOT NULL,
    "download_progress" REAL NOT NULL DEFAULT 0,
    "process_progress" REAL NOT NULL DEFAULT 0,
    "downloaded_mb" REAL,
    "total_mb" REAL,
    "speed" REAL,
    CONSTRAINT "processBook_bookAsin_fkey" FOREIGN KEY ("bookAsin") REFERENCES "books" ("asin") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "processBook_id_fkey" FOREIGN KEY ("id") REFERENCES "processQueue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_processQueue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "in_progress" BOOLEAN NOT NULL DEFAULT false,
    "is_done" BOOLEAN NOT NULL DEFAULT false,
    "result" TEXT,
    "try_after_time" BIGINT,
    "type" TEXT NOT NULL DEFAULT 'BOOK'
);
INSERT INTO "new_processQueue" ("id", "in_progress", "is_done", "result", "try_after_time") SELECT "id", "in_progress", "is_done", "result", "try_after_time" FROM "processQueue";
DROP TABLE "processQueue";
ALTER TABLE "new_processQueue" RENAME TO "processQueue";

CREATE TABLE "new_progress" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "progress" REAL NOT NULL,
    "downloaded_mb" REAL,
    "total_mb" REAL,
    "speed_mb_s" REAL,
    "message" TEXT NOT NULL,

    PRIMARY KEY ("id", "type")
);
INSERT INTO "new_progress" ("id", "type", "ref", "status", "progress", "downloaded_mb", "total_mb", "speed_mb_s", "message") SELECT "id", "type", "ref", "status", "progress", "downloaded_mb", "total_mb", "speed_mb_s", "message" FROM "Progress";
DROP TABLE "Progress";
ALTER TABLE "new_progress" RENAME TO "progress";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "processBook_bookAsin_key" ON "processBook"("bookAsin");
