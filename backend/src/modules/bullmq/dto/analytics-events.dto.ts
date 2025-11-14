import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsUUID,
} from 'class-validator';

export class IngestEventDto {
  @ApiProperty({
    description: 'Site identifier',
    example: 'site_abc123',
  })
  @IsString()
  @IsNotEmpty()
  siteId: string;

  @ApiProperty({
    description: 'Type of analytics event',
    example: 'page_view',
  })
  @IsString()
  @IsNotEmpty()
  eventType: string;

  @ApiProperty({
    description: 'URL path being tracked',
    example: '/products/shoes',
  })
  @IsString()
  @IsNotEmpty()
  path: string;

  @ApiProperty({
    description: 'Event timestamp in ISO 8601 format',
    example: '2024-11-14T09:00:00Z',
  })
  @IsDateString()
  timestamp: string;

  @ApiPropertyOptional({
    description: 'Unique event identifier (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
  eventId?: string;
}

export class StatsQueryDto {
  @ApiProperty({
    description: 'Site identifier',
    example: 'site_abc123',
  })
  @IsString()
  @IsNotEmpty()
  siteId: string;

  @ApiProperty({
    description: 'Date to query stats for (YYYY-MM-DD)',
    example: '2024-11-14',
  })
  @IsString()
  @IsNotEmpty()
  date: string;
}
