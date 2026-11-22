-- What Audible lets each account do with each of its books (from the library's customer_rights),
-- and whether any account with a book may download it. Existing books start as downloadable
-- until the next sync of their accounts fetches the rights.
-- CreateTable
CREATE TABLE "bookRights" (
    "asin" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "downloadable" BOOLEAN NOT NULL,
    "borrowed" BOOLEAN NOT NULL,
    "checked" INTEGER NOT NULL,

    PRIMARY KEY ("asin", "sourceId"),
    CONSTRAINT "bookRights_asin_fkey" FOREIGN KEY ("asin") REFERENCES "books" ("asin") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bookRights_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- AlterTable
ALTER TABLE "books" ADD COLUMN "downloadable" BOOLEAN NOT NULL DEFAULT true;
