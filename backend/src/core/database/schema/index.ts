import { healthChecking } from './health-checking';
import { users } from './users';
import { rawEvents } from './raw-events';
import { siteDailyAggregates } from './site-daily-aggregates';
import { siteDailyPathCounts } from './site-daily-path-counts';
import { siteDailyUniqueUsers } from './site-daily-unique-users';

export const schema = {
  healthChecking,
  users,
  rawEvents,
  siteDailyAggregates,
  siteDailyPathCounts,
  siteDailyUniqueUsers,
};

export { healthChecking, users, rawEvents, siteDailyAggregates, siteDailyPathCounts, siteDailyUniqueUsers };
