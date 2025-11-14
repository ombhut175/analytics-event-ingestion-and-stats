CREATE TABLE "raw_events" (
	"event_id" uuid PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"event_type" text NOT NULL,
	"path" text NOT NULL,
	"user_id" text NOT NULL,
	"event_ts" timestamp with time zone NOT NULL,
	"ingestion_ts" timestamp with time zone DEFAULT now() NOT NULL,
	"event_date" date GENERATED ALWAYS AS ((event_ts AT TIME ZONE 'UTC')::date) STORED NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_daily_aggregates" (
	"site_id" text NOT NULL,
	"date" date NOT NULL,
	"total_views" bigint DEFAULT 0 NOT NULL,
	"unique_users" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "site_daily_aggregates_site_id_date_pk" PRIMARY KEY("site_id","date")
);
--> statement-breakpoint
CREATE TABLE "site_daily_path_counts" (
	"site_id" text NOT NULL,
	"date" date NOT NULL,
	"path" text NOT NULL,
	"views" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "site_daily_path_counts_site_id_date_path_pk" PRIMARY KEY("site_id","date","path")
);
--> statement-breakpoint
CREATE TABLE "site_daily_unique_users" (
	"site_id" text NOT NULL,
	"date" date NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "site_daily_unique_users_site_id_date_user_id_unique" UNIQUE("site_id","date","user_id")
);
--> statement-breakpoint
CREATE INDEX "idx_raw_events_site_date" ON "raw_events" USING btree ("site_id","event_date");--> statement-breakpoint
CREATE INDEX "idx_raw_events_site_date_path" ON "raw_events" USING btree ("site_id","event_date","path");--> statement-breakpoint
CREATE INDEX "idx_path_counts_site_date_views_desc" ON "site_daily_path_counts" USING btree ("site_id","date","views" DESC NULLS LAST);