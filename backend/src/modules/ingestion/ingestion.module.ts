import { Module } from '@nestjs/common';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { BullmqModule } from '../bullmq/bullmq.module';

@Module({
  imports: [BullmqModule],
  controllers: [IngestionController],
  providers: [IngestionService],
})
export class IngestionModule {}
