import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './core/database/database.module';
import { TestModule } from './modules/test/test.module';
import { HealthCheckModule } from './modules/health-check/health-check.module';
import { BullmqModule } from './modules/bullmq/bullmq.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { envValidationSchema } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    TestModule,
    HealthCheckModule,
    BullmqModule,
    IngestionModule,
    ReportingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
