CREATE TABLE "cards"."image" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prompt" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cards"."meaning_image" (
	"meaning_id" integer NOT NULL,
	"image_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cards"."meaning_image" ADD CONSTRAINT "meaning_image_meaning_id_word_meaning_id_fk" FOREIGN KEY ("meaning_id") REFERENCES "cards"."word_meaning"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards"."meaning_image" ADD CONSTRAINT "meaning_image_image_id_image_id_fk" FOREIGN KEY ("image_id") REFERENCES "cards"."image"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "meaning_image_unique" ON "cards"."meaning_image" USING btree ("meaning_id","image_id");--> statement-breakpoint
ALTER TABLE "cards"."word_meaning" DROP COLUMN "image_key";