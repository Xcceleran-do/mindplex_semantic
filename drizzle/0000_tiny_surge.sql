CREATE TABLE "article_authors" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	CONSTRAINT "article_authors_unique_idx" UNIQUE("article_id", "user_id")
);
--> statement-breakpoint
CREATE TABLE "article_chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_id" integer NOT NULL,
	"chunk_index" integer NOT NULL,
	"raw_content" text NOT NULL,
	"embedded_content" text NOT NULL,
	"embedding" vector(1024),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_id" integer NOT NULL,
	"slug" text NOT NULL,
	"teaser" text,
	"title" text NOT NULL,
	"category" text,
	"tags" text [],
	"published_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"embedding" vector(1024),
	CONSTRAINT "articles_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_id" integer NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"username" text NOT NULL,
	"search_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
ALTER TABLE "article_authors"
ADD CONSTRAINT "article_authors_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "article_authors"
ADD CONSTRAINT "article_authors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "article_chunks"
ADD CONSTRAINT "article_chunks_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "article_chunks_article_id_idx" ON "article_chunks" USING btree ("article_id");
--> statement-breakpoint
CREATE INDEX "article_chunks_embedding_idx" ON "article_chunks" USING hnsw ("embedding" vector_cosine_ops);
--> statement-breakpoint
CREATE INDEX "articles_embedding_idx" ON "articles" USING hnsw ("embedding" vector_cosine_ops);
--> statement-breakpoint
CREATE INDEX "users_search_name_trgm_idx" ON "users" USING gin ("search_name" gin_trgm_ops);