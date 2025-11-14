export enum AnalyticsEventJobName {
  PROCESS_EVENT = 'process-event',
}

export interface ProcessEventPayload {
  eventId: string;
  siteId: string;
  eventType: string;
  path: string;
  timestamp: Date;
  visitorId: string;
}

export type AnalyticsEventJobPayload = ProcessEventPayload;
