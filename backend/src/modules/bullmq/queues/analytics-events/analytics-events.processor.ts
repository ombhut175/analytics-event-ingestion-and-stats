import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES } from '../../../../common/constants/string-const';
import {
  AnalyticsEventJobName,
  ProcessEventPayload,
  BatchProcessPayload,
  AnalyticsEventJobPayload,
} from './analytics-events.types';

@Processor(QUEUES.ANALYTICS_EVENTS)
export class AnalyticsEventsProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalyticsEventsProcessor.name);

  async process(job: Job<AnalyticsEventJobPayload>): Promise<unknown> {
    this.logger.log(`Processing job ${job.id} (${job.name})`, {
      jobId: job.id,
      jobName: job.name,
      attemptsMade: job.attemptsMade,
    });

    try {
      switch (job.name as AnalyticsEventJobName) {
        case AnalyticsEventJobName.PROCESS_EVENT:
          return await this.processEvent(job as Job<ProcessEventPayload>);

        case AnalyticsEventJobName.BATCH_PROCESS:
          return await this.batchProcess(job as Job<BatchProcessPayload>);

        default:
          throw new Error(`Unknown job name: ${job.name}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      this.logger.error(`Job ${job.id} processing failed`, {
        jobId: job.id,
        jobName: job.name,
        error: errorMessage,
        stack: errorStack,
      });
      throw error;
    }
  }

  private async processEvent(
    job: Job<ProcessEventPayload>,
  ): Promise<{ success: boolean; eventId: string }> {
    const { eventId, eventType, userId, sessionId, timestamp } = job.data;

    this.logger.log(`Processing analytics event`, {
      jobId: job.id,
      eventId,
      eventType,
      userId,
      sessionId,
      timestamp,
    });

    await job.updateProgress(25);

    await this.simulateProcessing(500);

    await job.updateProgress(50);

    this.logger.log(`Event processed successfully`, {
      jobId: job.id,
      eventId,
      eventType,
    });

    await job.updateProgress(100);

    return {
      success: true,
      eventId,
    };
  }

  private async batchProcess(
    job: Job<BatchProcessPayload>,
  ): Promise<{ success: boolean; processedCount: number }> {
    const { batchId, eventIds } = job.data;

    this.logger.log(`Processing batch of events`, {
      jobId: job.id,
      batchId,
      eventCount: eventIds.length,
    });

    let processedCount = 0;
    const totalEvents = eventIds.length;

    for (const eventId of eventIds) {
      await this.simulateProcessing(100);
      processedCount++;

      const progress = Math.round((processedCount / totalEvents) * 100);
      await job.updateProgress(progress);

      this.logger.debug(
        `Processed event ${eventId} (${processedCount}/${totalEvents})`,
      );
    }

    this.logger.log(`Batch processed successfully`, {
      jobId: job.id,
      batchId,
      processedCount,
    });

    return {
      success: true,
      processedCount,
    };
  }

  private async simulateProcessing(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job completed successfully`, {
      jobId: job.id,
      jobName: job.name,
      finishedOn: job.finishedOn,
      returnvalue: job.returnvalue,
    });
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    this.logger.error(`Job failed`, {
      jobId: job.id,
      jobName: job.name,
      attemptsMade: job.attemptsMade,
      error: errorMessage,
      stack: errorStack,
      failedReason: job.failedReason,
    });
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.debug(`Job started processing`, {
      jobId: job.id,
      jobName: job.name,
      timestamp: new Date().toISOString(),
    });
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job, progress: number | object) {
    this.logger.debug(`Job progress update`, {
      jobId: job.id,
      progress,
    });
  }
}
