ALTER TABLE "articles"
ADD COLUMN "category_temp" text [];
UPDATE "articles"
SET "category_temp" = ARRAY ["category"]::text []
WHERE "category" IS NOT NULL;
ALTER TABLE "articles" DROP COLUMN "category";
ALTER TABLE "articles"
    RENAME COLUMN "category_temp" TO "category";