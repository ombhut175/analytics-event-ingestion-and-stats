import { pgTable, text, date, bigint, primaryKey } from 'drizzle-orm/pg-core';

export const siteDailyAggregates = pgTable(
  'site_daily_aggregates',
  {
    siteId: text('site_id').notNull(),
    date: date('date').notNull(),
    totalViews: bigint('total_views', { mode: 'number' }).notNull().default(0),
    uniqueUsers: bigint('unique_users', { mode: 'number' }).notNull().default(0),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.siteId, table.date] }),
  }),
);
