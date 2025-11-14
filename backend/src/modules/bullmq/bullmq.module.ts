import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import * as basicAuth from 'express-basic-auth';
import { QUEUES, ENV } from '../../common/constants/string-const';
import { getBullConfig } from './bull.config';
import { AnalyticsEventsQueue } from './queues/analytics-events/analytics-events.queue';
import { AnalyticsEventsProcessor } from './queues/analytics-events/analytics-events.processor';
import { BullmqHealthController } from './bullmq-health.controller';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        getBullConfig(configService),
      inject: [ConfigService],
    }),

    BullModule.registerQueue({
      name: QUEUES.ANALYTICS_EVENTS,
    }),

    BullBoardModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isDevelopment =
          configService.get<string>(ENV.NODE_ENV) === 'development';
        const username =
          configService.get<string>('BULL_BOARD_USER') || 'admin';
        const password =
          configService.get<string>('BULL_BOARD_PASSWORD') || 'admin';

        return {
          route: '/queues/admin',
          adapter: ExpressAdapter,
          middleware: isDevelopment
            ? undefined
            : basicAuth({
                challenge: true,
                users: { [username]: password },
              }),
        };
      },
    }),

    BullBoardModule.forFeature({
      name: QUEUES.ANALYTICS_EVENTS,
      adapter: BullMQAdapter,
    }),
  ],
  controllers: [BullmqHealthController],
  providers: [AnalyticsEventsQueue, AnalyticsEventsProcessor],
  exports: [AnalyticsEventsQueue],
})
export class BullmqModule {}
