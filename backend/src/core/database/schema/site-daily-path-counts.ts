import { pgTable, text, date, bigint, primaryKey, index } from 'drizzle-orm/pg-core';

export const siteDailyPathCounts = pgTable(
  'site_daily_path_counts',
  {
    siteId: text('site_id').notNull(),
    date: date('date').notNull(),
    path: text('path').notNull(),
    views: bigint('views', { mode: 'number' }).notNull().default(0),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.siteId, table.date, table.path] }),
    siteIdDateViewsIdx: index('idx_path_counts_site_date_views_desc').on(
      table.siteId,
      table.date,
      table.views.desc(),
    ),
  }),
);
