import { Controller, Post, Body, HttpCode, HttpStatus, Req, Res, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { IngestionService } from './ingestion.service';
import { IngestEventDto } from '../bullmq/dto/analytics-events.dto';

const VISITOR_COOKIE_NAME = 'visitor_id';
const VISITOR_COOKIE_MAX_AGE = 365 * 24 * 60 * 60 * 1000;

@ApiTags('Ingestion')
@Controller('event')
export class IngestionController {
  private readonly logger = new Logger(IngestionController.name);

  constructor(private readonly ingestionService: IngestionService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Ingest analytics event' })
  @ApiCookieAuth('visitor_id')
  @ApiResponse({
    status: 202,
    description: 'Event accepted for processing',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        eventId: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
        visitorId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid event data' })
  async ingestEvent(
    @Body() dto: IngestEventDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    let visitorId = req.cookies?.[VISITOR_COOKIE_NAME];
    const isNewVisitor = !visitorId;

    if (!visitorId) {
      visitorId = randomUUID();
      this.logger.log(`Generated NEW visitor_id: ${visitorId}`);
      res.cookie(VISITOR_COOKIE_NAME, visitorId, {
        maxAge: VISITOR_COOKIE_MAX_AGE,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
    } else {
      this.logger.log(`Existing visitor_id from cookie: ${visitorId}`);
    }

    this.logger.log(`Ingesting event for siteId: ${dto.siteId}, visitorId: ${visitorId}, isNewVisitor: ${isNewVisitor}`);

    const eventId = await this.ingestionService.ingestEvent(dto, visitorId);
    return {
      success: true,
      eventId,
      visitorId,
    };
  }
}
