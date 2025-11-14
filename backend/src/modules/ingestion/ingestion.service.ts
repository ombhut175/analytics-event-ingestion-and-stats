import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IngestEventDto } from '../bullmq/dto/analytics-events.dto';
import { AnalyticsEventsQueue } from '../bullmq/queues/analytics-events/analytics-events.queue';

@Injectable()
export class IngestionService {
  constructor(private readonly analyticsQueue: AnalyticsEventsQueue) {}

  async ingestEvent(dto: IngestEventDto, visitorId: string): Promise<string> {
    const eventId = dto.eventId || randomUUID();

    await this.analyticsQueue.addProcessEventJob({
      eventId,
      siteId: dto.siteId,
      eventType: dto.eventType,
      path: dto.path,
      timestamp: new Date(dto.timestamp),
      visitorId,
    });

    return eventId;
  }
}
