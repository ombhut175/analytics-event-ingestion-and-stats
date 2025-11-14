import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { DrizzleService } from '../../core/database/drizzle.service';
import {
  siteDailyAggregates,
  siteDailyPathCounts,
} from '../../core/database/schema';

@Injectable()
export class ReportingService {
  constructor(
    @Inject(DrizzleService)
    private readonly drizzleService: DrizzleService,
  ) {}

  async getStats(siteId: string, date: string) {
    const db = this.drizzleService.getDb();

    const [aggregates] = await db
      .select()
      .from(siteDailyAggregates)
      .where(
        and(
          eq(siteDailyAggregates.siteId, siteId),
          eq(siteDailyAggregates.date, date),
        ),
      )
      .limit(1);

    if (!aggregates) {
      throw new NotFoundException(
        `No stats found for site ${siteId} on ${date}`,
      );
    }

    const topPaths = await db
      .select({
        path: siteDailyPathCounts.path,
        views: siteDailyPathCounts.views,
      })
      .from(siteDailyPathCounts)
      .where(
        and(
          eq(siteDailyPathCounts.siteId, siteId),
          eq(siteDailyPathCounts.date, date),
        ),
      )
      .orderBy(desc(siteDailyPathCounts.views))
      .limit(10);

    return {
      siteId,
      date,
      totalViews: Number(aggregates.totalViews),
      uniqueUsers: Number(aggregates.uniqueUsers),
      topPaths: topPaths.map((p: { path: string; views: number | bigint }) => ({
        path: p.path,
        views: Number(p.views),
      })),
    };
  }
}
