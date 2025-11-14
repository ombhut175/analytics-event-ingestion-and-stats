import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger, Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { and, eq, sql } from 'drizzle-orm';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';
import { ExtractTablesWithRelations } from 'drizzle-orm';
import { QUEUES } from '../../../../common/constants/string-const';
import { ProcessEventPayload } from './analytics-events.types';
import { DrizzleService } from '../../../../core/database/drizzle.service';
import {
  rawEvents,
  siteDailyAggregates,
  siteDailyPathCounts,
  siteDailyUniqueUsers,
} from '../../../../core/database/schema';

@Processor(QUEUES.ANALYTICS_EVENTS, {
  concurrency: 10,
})
export class AnalyticsEventsProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalyticsEventsProcessor.name);

  constructor(
    @Inject(DrizzleService)
    private readonly drizzleService: DrizzleService,
  ) {
    super();
  }

  async process(job: Job<ProcessEventPayload>): Promise<{ success: boolean }> {
    const { eventId, siteId, eventType, path, timestamp, visitorId } = job.data;

    const db = this.drizzleService.getDb();
    const eventDate = new Date(timestamp).toISOString().split('T')[0];

    this.logger.log(`Processing event: ${eventId}, visitorId: ${visitorId}, siteId: ${siteId}, date: ${eventDate}`);

    try {
      await db.transaction(async (tx: PgTransaction<NodePgQueryResultHKT, Record<string, never>, ExtractTablesWithRelations<Record<string, never>>>) => {
        await tx
          .insert(rawEvents)
          .values({
            eventId,
            siteId,
            eventType,
            path,
            visitorId,
            eventTs: new Date(timestamp),
          })
          .onConflictDoNothing();

        await tx
          .insert(siteDailyAggregates)
          .values({
            siteId,
            date: eventDate,
            totalViews: 1,
            uniqueUsers: 0,
          })
          .onConflictDoUpdate({
            target: [siteDailyAggregates.siteId, siteDailyAggregates.date],
            set: {
              totalViews: sql`${siteDailyAggregates.totalViews} + 1`,
            },
          });

        await tx
          .insert(siteDailyPathCounts)
          .values({
            siteId,
            date: eventDate,
            path,
            views: 1,
          })
          .onConflictDoUpdate({
            target: [
              siteDailyPathCounts.siteId,
              siteDailyPathCounts.date,
              siteDailyPathCounts.path,
            ],
            set: {
              views: sql`${siteDailyPathCounts.views} + 1`,
            },
          });

        this.logger.log(`Attempting to insert unique user: siteId=${siteId}, date=${eventDate}, visitorId=${visitorId}`);
        
        const insertResult = await tx
          .insert(siteDailyUniqueUsers)
          .values({
            siteId,
            date: eventDate,
            visitorId,
          })
          .onConflictDoNothing()
          .returning({ siteId: siteDailyUniqueUsers.siteId });

        this.logger.log(`Unique user insert result length: ${insertResult.length}`);

        if (insertResult.length > 0) {
          this.logger.log(`New unique user detected! Incrementing uniqueUsers counter`);
          await tx
            .update(siteDailyAggregates)
            .set({
              uniqueUsers: sql`${siteDailyAggregates.uniqueUsers} + 1`,
            })
            .where(
              and(
                eq(siteDailyAggregates.siteId, siteId),
                eq(siteDailyAggregates.date, eventDate),
              ),
            );
        } else {
          this.logger.log(`Duplicate visitor detected - not incrementing uniqueUsers`);
        }
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Job ${job.id} processing failed`, {
        jobId: job.id,
        eventId,
        siteId,
        error: errorMessage,
      });
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Job completed`, {
      jobId: job.id,
      eventId: job.data.eventId,
    });
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job failed`, {
      jobId: job.id,
      eventId: job.data.eventId,
      error: error.message,
      attemptsMade: job.attemptsMade,
    });
  }
}
