import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsArray,
  IsDateString,
} from 'class-validator';

export class ProcessEventDto {
  @ApiProperty({ description: 'Unique event identifier', example: 'evt_12345' })
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @ApiProperty({
    description: 'Type of the analytics event',
    example: 'page_view',
  })
  @IsString()
  @IsNotEmpty()
  eventType: string;

  @ApiPropertyOptional({ description: 'User identifier', example: 'user_123' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Session identifier',
    example: 'session_456',
  })
  @IsString()
  @IsOptional()
  sessionId?: string;

  @ApiProperty({
    description: 'Event timestamp',
    example: '2024-11-14T09:00:00Z',
  })
  @IsDateString()
  timestamp: string;

  @ApiProperty({
    description: 'Event properties',
    example: { page: '/home', referrer: 'google.com' },
  })
  @IsObject()
  properties: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { source: 'web', version: '1.0' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class BatchProcessDto {
  @ApiProperty({ description: 'Unique batch identifier', example: 'batch_789' })
  @IsString()
  @IsNotEmpty()
  batchId: string;

  @ApiProperty({
    description: 'Array of event IDs to process',
    example: ['evt_1', 'evt_2', 'evt_3'],
  })
  @IsArray()
  @IsString({ each: true })
  eventIds: string[];
}
