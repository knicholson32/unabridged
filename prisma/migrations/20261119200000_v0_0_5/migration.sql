-- Remove Plex: drop plexKey columns, Plex settings and Plex notifications.
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_authors" (
    "name" TEXT NOT NULL PRIMARY KEY
);
INSERT INTO "new_authors" ("name") SELECT "name" FROM "authors";
DROP TABLE "authors";
ALTER TABLE "new_authors" RENAME TO "authors";
CREATE TABLE "new_books" (
    "asin" TEXT NOT NULL PRIMARY KEY,
    "google_api_id" TEXT,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "absItemId" TEXT,
    "series_sequence" TEXT,
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
INSERT INTO "new_books" ("absItemId", "asin", "date_added", "description", "downloaded", "google_api_id", "isbn", "num_ratings", "processed", "purchase_date", "rating", "release_date", "runtime_length_min", "search_description", "seriesId", "series_sequence", "subtitle", "title") SELECT "absItemId", "asin", "date_added", "description", "downloaded", "google_api_id", "isbn", "num_ratings", "processed", "purchase_date", "rating", "release_date", "runtime_length_min", "search_description", "seriesId", "series_sequence", "subtitle", "title" FROM "books";
DROP TABLE "books";
ALTER TABLE "new_books" RENAME TO "books";
CREATE TABLE "new_series" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "absSeriesId" TEXT
);
INSERT INTO "new_series" ("absSeriesId", "id", "title") SELECT "absSeriesId", "id", "title" FROM "series";
DROP TABLE "series";
ALTER TABLE "new_series" RENAME TO "series";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Plex settings and notifications have nothing left to read them
DELETE FROM "settings" WHERE "setting" LIKE 'plex.%';
DELETE FROM "notifications" WHERE "issuer" = 'plex.scan.result';
