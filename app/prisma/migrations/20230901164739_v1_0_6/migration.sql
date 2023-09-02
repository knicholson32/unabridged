-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_branding" (
    "asin" TEXT NOT NULL PRIMARY KEY,
    "intro_duration_ms" INTEGER NOT NULL,
    "outro_duration_ms" INTEGER NOT NULL,
    CONSTRAINT "branding_asin_fkey" FOREIGN KEY ("asin") REFERENCES "books" ("asin") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_branding" ("asin", "intro_duration_ms", "outro_duration_ms") SELECT "asin", "intro_duration_ms", "outro_duration_ms" FROM "Branding";
DROP TABLE "Branding";
ALTER TABLE "new_branding" RENAME TO "branding";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;