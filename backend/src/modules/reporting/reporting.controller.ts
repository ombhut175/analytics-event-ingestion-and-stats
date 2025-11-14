import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ReportingService } from './reporting.service';
import { StatsQueryDto } from '../bullmq/dto/analytics-events.dto';

@ApiTags('Reporting')
@Controller('stats')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get()
  @ApiOperation({ summary: 'Get analytics statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        siteId: { type: 'string', example: 'site_abc123' },
        date: { type: 'string', example: '2024-11-14' },
        totalViews: { type: 'number', example: 1250 },
        uniqueUsers: { type: 'number', example: 320 },
        topPaths: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string', example: '/products' },
              views: { type: 'number', example: 450 },
            },
          },
        },
      },
    },
  })
  async getStats(@Query() query: StatsQueryDto) {
    return this.reportingService.getStats(query.siteId, query.date);
  }
}
