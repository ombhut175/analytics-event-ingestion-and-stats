-- Drop the user_id unique constraint that's causing issues
ALTER TABLE "site_daily_unique_users" DROP CONSTRAINT IF EXISTS "unq_site_date_user";
