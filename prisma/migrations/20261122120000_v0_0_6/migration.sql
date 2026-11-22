-- Per-account setting: download books that a sync finds are new. Off for existing accounts.
-- AlterTable
ALTER TABLE "sources" ADD COLUMN "auto_download" BOOLEAN NOT NULL DEFAULT false;
