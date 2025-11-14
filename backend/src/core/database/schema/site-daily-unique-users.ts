import { pgTable, text, date, unique, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const siteDailyUniqueUsers = pgTable(
  'site_daily_unique_users',
  {
    siteId: text('site_id').notNull(),
    date: date('date').notNull(),
    userId: text('user_id'),
    visitorId: text('visitor_id'),
  },
  (table) => ({
    visitorUnq: unique('unq_site_date_visitor').on(table.siteId, table.date, table.visitorId).nullsNotDistinct(),
    siteIdDateIdx: index('idx_unique_users_site_date').on(table.siteId, table.date),
  }),
);
