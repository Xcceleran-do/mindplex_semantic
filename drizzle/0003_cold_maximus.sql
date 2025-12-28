ALTER TABLE "users" ALTER COLUMN "search_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" drop column "search_name";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "search_name" text GENERATED ALWAYS AS (lower(first_name || ' ' || last_name || ' ' || username || ' ' || COALESCE(email, ''))) STORED;