export enum AnalyticsEventJobName {
  PROCESS_EVENT = 'process-event',
  BATCH_PROCESS = 'batch-process',
}

export interface ProcessEventPayload {
  eventId: string;
  eventType: string;
  userId?: string;
  sessionId?: string;
  timestamp: Date;
  properties: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface BatchProcessPayload {
  eventIds: string[];
  batchId: string;
  timestamp: Date;
}

export type AnalyticsEventJobPayload =
  | ProcessEventPayload
  | BatchProcessPayload;
