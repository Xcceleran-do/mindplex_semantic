ALTER TABLE "summaries" ALTER COLUMN "tone" SET DATA TYPE varchar(50);--> statement-breakpoint
CREATE INDEX "summaries_tone_idx" ON "summaries" USING btree ("tone");