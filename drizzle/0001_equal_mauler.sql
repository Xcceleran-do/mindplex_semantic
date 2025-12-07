-- ALTER TABLE "articles" ALTER COLUMN "category" SET DATA TYPE text[];
UPDATE "articles"
SET "category" = CAST("category" [1] AS text []);