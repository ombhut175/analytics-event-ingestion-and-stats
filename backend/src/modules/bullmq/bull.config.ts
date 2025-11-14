import { ConfigService } from '@nestjs/config';
import { ENV } from '../../common/constants/string-const';
import { RedisOptions } from 'ioredis';

export const getBullConfig = (configService: ConfigService) => {
  const redisConnection: RedisOptions = {
    host: configService.get<string>(ENV.REDIS_HOST, 'localhost'),
    port: configService.get<number>(ENV.REDIS_PORT, 6379),
    password: configService.get<string>(ENV.REDIS_PASSWORD),
    db: configService.get<number>(ENV.REDIS_DB, 0),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };

  return {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential' as const,
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    },
  };
};
