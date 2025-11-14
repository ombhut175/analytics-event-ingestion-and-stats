import { pgTable, text, date, unique } from 'drizzle-orm/pg-core';

export const siteDailyUniqueUsers = pgTable(
  'site_daily_unique_users',
  {
    siteId: text('site_id').notNull(),
    date: date('date').notNull(),
    userId: text('user_id').notNull(),
  },
  (table) => ({
    unq: unique().on(table.siteId, table.date, table.userId),
  }),
);
