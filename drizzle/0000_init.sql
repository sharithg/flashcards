CREATE TABLE "card_progress" (
	"card_id" text PRIMARY KEY NOT NULL,
	"level" smallint NOT NULL,
	CONSTRAINT "card_progress_level_range" CHECK ("card_progress"."level" between 0 and 2)
);
--> statement-breakpoint
CREATE TABLE "cards" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"position" integer NOT NULL,
	"term" text NOT NULL,
	"definition" text NOT NULL,
	"starred" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_days" (
	"day" date PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_sets" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"best_match_time_ms" integer,
	"last_studied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "card_progress" ADD CONSTRAINT "card_progress_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_set_id_study_sets_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."study_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cards_set_position_idx" ON "cards" USING btree ("set_id","position");