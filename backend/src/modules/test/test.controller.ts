import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TestService } from './test.service';
import { successResponse } from '../../common/helpers/api-response.helper';

@ApiTags('test')
@Controller('test')
export class TestController {
  private readonly logger = new Logger(TestController.name);

  constructor(
    private readonly testService: TestService,
  ) {}

  //#region ==================== DATABASE TESTS ====================

  @Get('database-status')
  @ApiOperation({ summary: 'Check database infrastructure status' })
  @ApiResponse({
    status: 200,
    description: 'Database infrastructure status checked successfully',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 200 },
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Database infrastructure is ready' },
        data: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Database connection service is configured and ready to use when models are created' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 500, description: 'Database infrastructure check failed' })
  async checkDatabaseStatus() {
    this.logger.log('Checking database infrastructure status...');
    
    try {
      const result = await this.testService.testDatabaseConnection();
      this.logger.log('Database infrastructure status check completed successfully');
      return successResponse(result.data, result.message);
    } catch (error) {
      this.logger.error('Database infrastructure status check failed', error.stack);
      throw error;
    }
  }

  @Get('health-check-db')
  @ApiOperation({ summary: 'Test health_checking table by adding and removing a record' })
  @ApiResponse({
    status: 200,
    description: 'Health check table test completed successfully',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 200 },
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Health check table test completed successfully' },
        data: {
          type: 'object',
          properties: {
            recordId: { type: 'number', example: 1 },
            operations: {
              type: 'object',
              properties: {
                insert: { type: 'string', example: 'successful' },
                delete: { type: 'string', example: 'successful' },
                verification: { type: 'string', example: 'successful' }
              }
            },
            timestamp: { type: 'string', example: '2023-01-01T00:00:00.000Z' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 500,
    description: 'Health check table test failed',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Health check table test failed' },
        data: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Database connection error' },
            timestamp: { type: 'string', example: '2023-01-01T00:00:00.000Z' }
          }
        }
      }
    }
  })
  async testHealthCheckTable() {
    this.logger.log('Starting health check table test...');
    
    try {
      const result = await this.testService.testHealthCheckTable();
      this.logger.log('Health check table test completed successfully');
      return successResponse(result.data, result.message);
    } catch (error) {
      this.logger.error('Health check table test failed', error.stack);
      throw error;
    }
  }

  //#endregion

  //#region ==================== FRONTEND TESTING ENDPOINT ====================

  @Get('testing')
  @ApiOperation({ summary: 'Testing endpoint for frontend integration' })
  @ApiResponse({ 
    status: 200, 
    description: 'Testing data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 200 },
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Testing data retrieved successfully' },
        data: { 
          type: 'object',
          properties: {
            timestamp: { type: 'string', example: '2023-01-01T00:00:00Z' },
            environment: { type: 'string', example: 'development' },
            version: { type: 'string', example: '1.0.0' },
            features: { 
              type: 'array', 
              items: { type: 'string' },
              example: ['auth', 'database', 'api'] 
            },
            stats: {
              type: 'object',
              properties: {
                uptime: { type: 'number', example: 12345 },
                requests: { type: 'number', example: 150 },
                users: { type: 'number', example: 25 }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 500, description: 'Failed to retrieve testing data' })
  async getTestingData() {
    this.logger.log('Retrieving testing data for frontend integration...');
    
    try {
      const testingData = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
        features: ['database', 'api', 'health-check'],
        stats: {
          uptime: Math.floor(process.uptime()),
          requests: Math.floor(Math.random() * 1000) + 100,
          users: Math.floor(Math.random() * 100) + 10
        }
      };
      
      this.logger.log(`Testing data retrieved successfully - Environment: ${testingData.environment}, Uptime: ${testingData.stats.uptime}s`);
      
      return successResponse(testingData, 'Testing data retrieved successfully');
    } catch (error) {
      this.logger.error('Failed to retrieve testing data', error.stack);
      throw error;
    }
  }

  //#endregion
}
