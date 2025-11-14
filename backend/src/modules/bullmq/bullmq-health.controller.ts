import { Controller, Get, Param, Post, Body, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AnalyticsEventsQueue } from './queues/analytics-events/analytics-events.queue';
import { ProcessEventDto, BatchProcessDto } from './dto/analytics-events.dto';

@ApiTags('Queue Management')
@Controller('queues')
export class BullmqHealthController {
  constructor(private readonly analyticsEventsQueue: AnalyticsEventsQueue) {}

  @Get('health')
  @ApiOperation({ summary: 'Get queue health status' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Queue health metrics' })
  async getHealth() {
    const metrics = await this.analyticsEventsQueue.getQueueMetrics();

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      metrics,
    };
  }

  @Get('job/:jobId')
  @ApiOperation({ summary: 'Get job status by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Job status retrieved' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Job not found' })
  async getJobStatus(@Param('jobId') jobId: string) {
    const status = await this.analyticsEventsQueue.getJobStatus(jobId);

    if (!status) {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Job not found',
      };
    }

    return status;
  }

  @Post('test/process-event')
  @ApiOperation({ summary: 'Test endpoint to enqueue an analytics event' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Event job created' })
  async testProcessEvent(@Body() dto: ProcessEventDto) {
    const jobId = await this.analyticsEventsQueue.addProcessEventJob({
      eventId: dto.eventId,
      eventType: dto.eventType,
      userId: dto.userId,
      sessionId: dto.sessionId,
      timestamp: new Date(dto.timestamp),
      properties: dto.properties,
      metadata: dto.metadata,
    });

    return {
      message: 'Event job created successfully',
      jobId,
    };
  }

  @Post('test/batch-process')
  @ApiOperation({ summary: 'Test endpoint to enqueue a batch processing job' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Batch job created' })
  async testBatchProcess(@Body() dto: BatchProcessDto) {
    const jobId = await this.analyticsEventsQueue.addBatchProcessJob({
      batchId: dto.batchId,
      eventIds: dto.eventIds,
      timestamp: new Date(),
    });

    return {
      message: 'Batch job created successfully',
      jobId,
      eventCount: dto.eventIds.length,
    };
  }

  @Post('pause')
  @ApiOperation({ summary: 'Pause the analytics events queue' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Queue paused' })
  async pauseQueue() {
    await this.analyticsEventsQueue.pauseQueue();

    return {
      message: 'Queue paused successfully',
    };
  }

  @Post('resume')
  @ApiOperation({ summary: 'Resume the analytics events queue' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Queue resumed' })
  async resumeQueue() {
    await this.analyticsEventsQueue.resumeQueue();

    return {
      message: 'Queue resumed successfully',
    };
  }
}
