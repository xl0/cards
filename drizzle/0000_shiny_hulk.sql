CREATE SCHEMA "cards";
--> statement-breakpoint
CREATE TYPE "cards"."generation_status" AS ENUM('pending', 'in_progress', 'success', 'failed_no_good_image', 'failed_error');--> statement-breakpoint
CREATE TYPE "cards"."image_source" AS ENUM('uploaded', 'generated');--> statement-breakpoint
CREATE TYPE "cards"."lang" AS ENUM('en', 'es');--> statement-breakpoint
CREATE TYPE "cards"."lang_pair" AS ENUM('en_es');--> statement-breakpoint
CREATE TYPE "cards"."part_of_speech" AS ENUM('noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'interjection', 'determiner');--> statement-breakpoint
CREATE TABLE "cards"."image" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prompt" text,
	"source" "cards"."image_source" DEFAULT 'uploaded' NOT NULL,
	"generation_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cards"."image_generation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meaning_id" integer NOT NULL,
	"status" "cards"."generation_status" DEFAULT 'pending' NOT NULL,
	"word" text NOT NULL,
	"meaning" text NOT NULL,
	"language" text NOT NULL,
	"attempts" jsonb,
	"final_image_id" uuid,
	"error" text,
	"langfuse_trace_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cards"."meaning_image" (
	"meaning_id" integer NOT NULL,
	"image_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cards"."meaning_relation" (
	"id" serial PRIMARY KEY NOT NULL,
	"lang_pair" "cards"."lang_pair" NOT NULL,
	"meaning_id_1" integer NOT NULL,
	"meaning_id_2" integer NOT NULL,
	"relation_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cards"."session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cards"."translation" (
	"id" serial PRIMARY KEY NOT NULL,
	"lang_pair" "cards"."lang_pair" NOT NULL,
	"src_meaning_id" integer NOT NULL,
	"dst_meaning_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cards"."user" (
	"id" text PRIMARY KEY NOT NULL,
	"age" integer,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "cards"."word" (
	"id" serial PRIMARY KEY NOT NULL,
	"lang_pair" "cards"."lang_pair" NOT NULL,
	"text" text NOT NULL,
	"lang" "cards"."lang" NOT NULL,
	"pos" "cards"."part_of_speech" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cards"."word_meaning" (
	"id" serial PRIMARY KEY NOT NULL,
	"lang_pair" "cards"."lang_pair" NOT NULL,
	"word_id" integer NOT NULL,
	"definition" text NOT NULL,
	"examples" jsonb,
	"image_gen_status" "cards"."generation_status",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cards"."image" ADD CONSTRAINT "image_generation_id_image_generation_id_fk" FOREIGN KEY ("generation_id") REFERENCES "cards"."image_generation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards"."image_generation" ADD CONSTRAINT "image_generation_meaning_id_word_meaning_id_fk" FOREIGN KEY ("meaning_id") REFERENCES "cards"."word_meaning"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards"."meaning_image" ADD CONSTRAINT "meaning_image_meaning_id_word_meaning_id_fk" FOREIGN KEY ("meaning_id") REFERENCES "cards"."word_meaning"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards"."meaning_image" ADD CONSTRAINT "meaning_image_image_id_image_id_fk" FOREIGN KEY ("image_id") REFERENCES "cards"."image"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards"."meaning_relation" ADD CONSTRAINT "meaning_relation_meaning_id_1_word_meaning_id_fk" FOREIGN KEY ("meaning_id_1") REFERENCES "cards"."word_meaning"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards"."meaning_relation" ADD CONSTRAINT "meaning_relation_meaning_id_2_word_meaning_id_fk" FOREIGN KEY ("meaning_id_2") REFERENCES "cards"."word_meaning"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards"."session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "cards"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards"."translation" ADD CONSTRAINT "translation_src_meaning_id_word_meaning_id_fk" FOREIGN KEY ("src_meaning_id") REFERENCES "cards"."word_meaning"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards"."translation" ADD CONSTRAINT "translation_dst_meaning_id_word_meaning_id_fk" FOREIGN KEY ("dst_meaning_id") REFERENCES "cards"."word_meaning"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards"."word_meaning" ADD CONSTRAINT "word_meaning_word_id_word_id_fk" FOREIGN KEY ("word_id") REFERENCES "cards"."word"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "image_generation_meaning_idx" ON "cards"."image_generation" USING btree ("meaning_id");--> statement-breakpoint
CREATE UNIQUE INDEX "meaning_image_unique" ON "cards"."meaning_image" USING btree ("meaning_id","image_id");--> statement-breakpoint
CREATE UNIQUE INDEX "meaning_relation_unique" ON "cards"."meaning_relation" USING btree ("lang_pair","meaning_id_1","meaning_id_2","relation_type");--> statement-breakpoint
CREATE UNIQUE INDEX "translation_pair_unique" ON "cards"."translation" USING btree ("lang_pair","src_meaning_id","dst_meaning_id");--> statement-breakpoint
CREATE UNIQUE INDEX "word_text_lang_pos" ON "cards"."word" USING btree ("lang_pair","text","lang","pos");--> statement-breakpoint
CREATE UNIQUE INDEX "meaning_definition_idx" ON "cards"."word_meaning" USING btree ("lang_pair","word_id","definition");