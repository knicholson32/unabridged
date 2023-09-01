-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_processQueue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookAsin" TEXT NOT NULL,
    "in_progress" BOOLEAN NOT NULL DEFAULT false,
    "is_done" BOOLEAN NOT NULL DEFAULT false,
    "result" TEXT,
    "try_after_time" BIGINT,
    "download_progress" REAL NOT NULL DEFAULT 0,
    "process_progress" REAL NOT NULL DEFAULT 0,
    "downloaded_mb" REAL,
    "total_mb" REAL,
    "speed" REAL,
    CONSTRAINT "processQueue_bookAsin_fkey" FOREIGN KEY ("bookAsin") REFERENCES "books" ("asin") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_processQueue" ("bookAsin", "download_progress", "downloaded_mb", "id", "in_progress", "is_done", "process_progress", "result", "speed", "total_mb", "try_after_time") SELECT "bookAsin", "download_progress", "downloaded_mb", "id", "in_progress", "is_done", "process_progress", "result", "speed", "total_mb", "try_after_time" FROM "processQueue";
DROP TABLE "processQueue";
ALTER TABLE "new_processQueue" RENAME TO "processQueue";
CREATE UNIQUE INDEX "processQueue_bookAsin_key" ON "processQueue"("bookAsin");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
