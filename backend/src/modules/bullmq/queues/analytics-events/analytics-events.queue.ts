import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, JobsOptions } from 'bullmq';
import { QUEUES } from '../../../../common/constants/string-const';
import {
  AnalyticsEventJobName,
  ProcessEventPayload,
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
    const job = await this.queue.add(
      AnalyticsEventJobName.PROCESS_EVENT,
      payload,
      {
        priority: 1,
        removeOnComplete: 1000,
        removeOnFail: 5000,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        ...options,
      },
    );

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
