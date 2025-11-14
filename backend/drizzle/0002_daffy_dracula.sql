ALTER TABLE "site_daily_unique_users" DROP CONSTRAINT "site_daily_unique_users_site_id_date_user_id_unique";--> statement-breakpoint
ALTER TABLE "raw_events" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "site_daily_unique_users" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "raw_events" ADD COLUMN "visitor_id" text;--> statement-breakpoint
ALTER TABLE "site_daily_unique_users" ADD COLUMN "visitor_id" text;--> statement-breakpoint
CREATE INDEX "idx_unique_users_site_date" ON "site_daily_unique_users" USING btree ("site_id","date");--> statement-breakpoint
ALTER TABLE "site_daily_unique_users" ADD CONSTRAINT "unq_site_date_user" UNIQUE NULLS NOT DISTINCT("site_id","date","user_id");--> statement-breakpoint
ALTER TABLE "site_daily_unique_users" ADD CONSTRAINT "unq_site_date_visitor" UNIQUE NULLS NOT DISTINCT("site_id","date","visitor_id");