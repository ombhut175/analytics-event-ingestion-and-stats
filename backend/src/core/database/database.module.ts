import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DrizzleService } from './drizzle.service';
import { UsersRepository, HealthCheckingRepository } from './repositories';

@Module({
  imports: [ConfigModule],
  providers: [
    DrizzleService,
    UsersRepository,
    HealthCheckingRepository,
  ],
  exports: [
    DrizzleService,
    UsersRepository,
    HealthCheckingRepository,
  ],
})
export class DatabaseModule {}
