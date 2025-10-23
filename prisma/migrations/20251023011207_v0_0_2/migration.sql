-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_books" (
    "asin" TEXT NOT NULL PRIMARY KEY,
    "google_api_id" TEXT,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "plexKey" TEXT,
    "series_sequence" INTEGER,
    "runtime_length_min" INTEGER,
    "rating" DECIMAL NOT NULL,
    "num_ratings" INTEGER NOT NULL,
    "release_date" BIGINT NOT NULL,
    "description" TEXT,
    "search_description" TEXT,
    "isbn" TEXT,
    "purchase_date" BIGINT NOT NULL,
    "seriesId" TEXT,
    "date_added" INTEGER NOT NULL DEFAULT 0,
    "downloaded" BOOLEAN NOT NULL,
    "processed" BOOLEAN NOT NULL,
    CONSTRAINT "books_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "series" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_books" ("asin", "description", "downloaded", "google_api_id", "isbn", "num_ratings", "plexKey", "processed", "purchase_date", "rating", "release_date", "runtime_length_min", "search_description", "seriesId", "series_sequence", "subtitle", "title") SELECT "asin", "description", "downloaded", "google_api_id", "isbn", "num_ratings", "plexKey", "processed", "purchase_date", "rating", "release_date", "runtime_length_min", "search_description", "seriesId", "series_sequence", "subtitle", "title" FROM "books";
DROP TABLE "books";
ALTER TABLE "new_books" RENAME TO "books";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
