CREATE TABLE "health_checking" (
	"id" serial PRIMARY KEY NOT NULL,
	"service" text NOT NULL,
	"status" text NOT NULL,
	"message" text,
	"details" jsonb,
	"checked_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
