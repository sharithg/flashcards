-- Scope data to Clerk users. Rows that existed before accounts get the placeholder owner
-- 'unclaimed'; hand them to a real account with `pnpm db:claim <clerk_user_id>`.
ALTER TABLE "study_sets" ADD COLUMN "user_id" text NOT NULL DEFAULT 'unclaimed';--> statement-breakpoint
ALTER TABLE "study_sets" ALTER COLUMN "user_id" DROP DEFAULT;--> statement-breakpoint
CREATE INDEX "study_sets_user_id_idx" ON "study_sets" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "study_days" ADD COLUMN "user_id" text NOT NULL DEFAULT 'unclaimed';--> statement-breakpoint
ALTER TABLE "study_days" ALTER COLUMN "user_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "study_days" DROP CONSTRAINT "study_days_pkey";--> statement-breakpoint
ALTER TABLE "study_days" ADD CONSTRAINT "study_days_user_id_day_pk" PRIMARY KEY("user_id","day");
