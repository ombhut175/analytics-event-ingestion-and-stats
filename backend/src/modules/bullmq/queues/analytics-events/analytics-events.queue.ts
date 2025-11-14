import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, JobsOptions } from 'bullmq';
import { QUEUES } from '../../../../common/constants/string-const';
import {
  AnalyticsEventJobName,
  ProcessEventPayload,
  BatchProcessPayload,
} from './analytics-events.types';

@Injectable()
export class AnalyticsEventsQueue {
  private readonly logger = new Logger(AnalyticsEventsQueue.name);

  constructor(
    @InjectQueue(QUEUES.ANALYTICS_EVENTS)
    private readonly queue: Queue,
  ) {}

  async addProcessEventJob(
    payload: ProcessEventPayload,
    options?: JobsOptions,
  ): Promise<string> {
    this.logger.log('Adding process event job', {
      eventType: payload.eventType,
      eventId: payload.eventId,
      userId: payload.userId,
    });

    const job = await this.queue.add(
      AnalyticsEventJobName.PROCESS_EVENT,
      payload,
      {
        priority: 1,
        ...options,
      },
    );

    this.logger.log(`Job added successfully with ID: ${job.id}`, {
      jobId: job.id,
      eventId: payload.eventId,
    });

    return job.id as string;
  }

  async addBatchProcessJob(
    payload: BatchProcessPayload,
    options?: JobsOptions,
  ): Promise<string> {
    this.logger.log('Adding batch process job', {
      batchId: payload.batchId,
      eventCount: payload.eventIds.length,
    });

    const job = await this.queue.add(
      AnalyticsEventJobName.BATCH_PROCESS,
      payload,
      {
        priority: 5,
        ...options,
      },
    );

    this.logger.log(`Batch job added successfully with ID: ${job.id}`, {
      jobId: job.id,
      batchId: payload.batchId,
    });

    return job.id as string;
  }

  async getJobStatus(jobId: string) {
    const job = await this.queue.getJob(jobId);

    if (!job) {
      return null;
    }

    return {
      id: job.id,
      name: job.name,
      state: await job.getState(),
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn,
      data: job.data,
    };
  }

  async pauseQueue(): Promise<void> {
    await this.queue.pause();
    this.logger.log('Queue paused');
  }

  async resumeQueue(): Promise<void> {
    await this.queue.resume();
    this.logger.log('Queue resumed');
  }

  async getQueueMetrics() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }
}
