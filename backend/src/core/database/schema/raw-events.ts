import { pgTable, uuid, text, timestamp, date, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const rawEvents = pgTable(
  'raw_events',
  {
    eventId: uuid('event_id').primaryKey().notNull(),
    siteId: text('site_id').notNull(),
    eventType: text('event_type').notNull(),
    path: text('path').notNull(),
    userId: text('user_id'),
    visitorId: text('visitor_id'),
    eventTs: timestamp('event_ts', { withTimezone: true }).notNull(),
    ingestionTs: timestamp('ingestion_ts', { withTimezone: true }).defaultNow().notNull(),
    eventDate: date('event_date').generatedAlwaysAs(sql`(event_ts AT TIME ZONE 'UTC')::date`).notNull(),
  },
  (table) => ({
    siteIdDateIdx: index('idx_raw_events_site_date').on(table.siteId, table.eventDate),
    siteIdDatePathIdx: index('idx_raw_events_site_date_path').on(table.siteId, table.eventDate, table.path),
  }),
);
