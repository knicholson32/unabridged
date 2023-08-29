-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "icon_path" TEXT,
    "icon_color" TEXT,
    "theme" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sub_text" TEXT,
    "linger_time" INTEGER NOT NULL,
    "needs_clearing" BOOLEAN NOT NULL,
    "auto_open" BOOLEAN NOT NULL,
    "issuer" TEXT NOT NULL,
    "identifier" TEXT
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "amazon_acct" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "description" TEXT,
    "profile_image_url" TEXT,
    "last_sync" INTEGER,
    "added_date" INTEGER NOT NULL,
    "locale_code" TEXT NOT NULL,
    "auto_sync" BOOLEAN NOT NULL,
    "activation_bytes" TEXT
);

-- CreateTable
CREATE TABLE "images" (
    "id" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "full" BLOB NOT NULL,
    "i512" BLOB NOT NULL,
    "i256" BLOB NOT NULL,
    "i128" BLOB NOT NULL,
    "i56" BLOB NOT NULL,
    CONSTRAINT "images_id_fkey" FOREIGN KEY ("id") REFERENCES "accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "authors" (
    "name" TEXT NOT NULL PRIMARY KEY
);

-- CreateTable
CREATE TABLE "narrators" (
    "name" TEXT NOT NULL PRIMARY KEY
);

-- CreateTable
CREATE TABLE "genres" (
    "tag" TEXT NOT NULL PRIMARY KEY
);

-- CreateTable
CREATE TABLE "series" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "books" (
    "asin" TEXT NOT NULL PRIMARY KEY,
    "google_api_id" TEXT,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
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
    "downloaded" BOOLEAN NOT NULL,
    "processed" BOOLEAN NOT NULL,
    CONSTRAINT "books_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "series" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "covers" (
    "asin" TEXT NOT NULL PRIMARY KEY,
    "url_50" TEXT NOT NULL,
    "url_100" TEXT NOT NULL,
    "url_500" TEXT NOT NULL,
    "url_1000" TEXT NOT NULL,
    "hex_dom" TEXT,
    "hex_dom_bright" BOOLEAN,
    "hex_sim" TEXT,
    "hex_sim_bright" BOOLEAN,
    "hex_sqr" TEXT,
    "hex_sqr_bright" BOOLEAN,
    "url_isbn" TEXT,
    "url_isbn_s" TEXT,
    CONSTRAINT "covers_asin_fkey" FOREIGN KEY ("asin") REFERENCES "books" ("asin") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookAsin" TEXT NOT NULL,
    "data" BLOB,
    "is_file" BOOLEAN NOT NULL,
    "path" TEXT,
    "content_type" TEXT NOT NULL,
    "description" TEXT,
    "extension" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "size_b" INTEGER NOT NULL,
    CONSTRAINT "media_bookAsin_fkey" FOREIGN KEY ("bookAsin") REFERENCES "books" ("asin") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Branding" (
    "asin" TEXT NOT NULL PRIMARY KEY,
    "intro_duration_ms" INTEGER NOT NULL,
    "outro_duration_ms" INTEGER NOT NULL,
    CONSTRAINT "Branding_asin_fkey" FOREIGN KEY ("asin") REFERENCES "books" ("asin") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chapters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookAsin" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "length_ms" INTEGER NOT NULL,
    "start_offset_ms" INTEGER NOT NULL,
    CONSTRAINT "chapters_bookAsin_fkey" FOREIGN KEY ("bookAsin") REFERENCES "books" ("asin") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Progress" (
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

-- CreateTable
CREATE TABLE "_AuthorToBook" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_AuthorToBook_A_fkey" FOREIGN KEY ("A") REFERENCES "authors" ("name") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_AuthorToBook_B_fkey" FOREIGN KEY ("B") REFERENCES "books" ("asin") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_BookToProfile" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_BookToProfile_A_fkey" FOREIGN KEY ("A") REFERENCES "books" ("asin") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_BookToProfile_B_fkey" FOREIGN KEY ("B") REFERENCES "accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_BookToNarrator" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_BookToNarrator_A_fkey" FOREIGN KEY ("A") REFERENCES "books" ("asin") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_BookToNarrator_B_fkey" FOREIGN KEY ("B") REFERENCES "narrators" ("name") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_BookToGenre" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_BookToGenre_A_fkey" FOREIGN KEY ("A") REFERENCES "books" ("asin") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_BookToGenre_B_fkey" FOREIGN KEY ("B") REFERENCES "genres" ("tag") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "images_id_key" ON "images"("id");

-- CreateIndex
CREATE UNIQUE INDEX "_AuthorToBook_AB_unique" ON "_AuthorToBook"("A", "B");

-- CreateIndex
CREATE INDEX "_AuthorToBook_B_index" ON "_AuthorToBook"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_BookToProfile_AB_unique" ON "_BookToProfile"("A", "B");

-- CreateIndex
CREATE INDEX "_BookToProfile_B_index" ON "_BookToProfile"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_BookToNarrator_AB_unique" ON "_BookToNarrator"("A", "B");

-- CreateIndex
CREATE INDEX "_BookToNarrator_B_index" ON "_BookToNarrator"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_BookToGenre_AB_unique" ON "_BookToGenre"("A", "B");

-- CreateIndex
CREATE INDEX "_BookToGenre_B_index" ON "_BookToGenre"("B");
