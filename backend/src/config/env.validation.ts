import * as Joi from 'joi';
import { ENV } from '../common/constants/string-const';

export const envValidationSchema = Joi.object({
  // Database Configuration
  [ENV.DATABASE_URL]: Joi.string().uri().optional(),
  [ENV.DATABASE_HOST]: Joi.string().hostname().optional(),
  [ENV.DATABASE_PORT]: Joi.number().port().optional(),
  [ENV.DATABASE_NAME]: Joi.string().optional(),
  [ENV.DATABASE_USER]: Joi.string().optional(),
  [ENV.DATABASE_PASSWORD]: Joi.string().optional(),
  
  // Application Configuration
  [ENV.NODE_ENV]: Joi.string().valid('development', 'production', 'test').default('development'),
  [ENV.PORT]: Joi.number().port().default(3000),
  
  // Swagger Configuration (Optional)
  [ENV.SWAGGER_USER]: Joi.string().optional(),
  [ENV.SWAGGER_PASSWORD]: Joi.string().optional(),
  [ENV.SWAGGER_ENABLED]: Joi.boolean().optional().default(true),
  [ENV.SWAGGER_UI_DEEP_LINKING]: Joi.boolean().optional().default(true),
  [ENV.SWAGGER_UI_DOC_EXPANSION]: Joi.string().valid('list', 'full', 'none').optional().default('none'),
  [ENV.SWAGGER_UI_FILTER]: Joi.alternatives().try(Joi.boolean(), Joi.string()).optional().default(true),
  
  // Redis Configuration (for BullMQ)
  [ENV.REDIS_HOST]: Joi.string().hostname().default('localhost'),
  [ENV.REDIS_PORT]: Joi.number().port().default(6379),
  [ENV.REDIS_PASSWORD]: Joi.string().optional(),
  [ENV.REDIS_DB]: Joi.number().integer().min(0).max(15).default(0),
}).custom((value, helpers) => {
  // Ensure either DATABASE_URL or all individual database parameters are provided
  const hasDatabaseUrl = value[ENV.DATABASE_URL];
  const hasIndividualParams = value[ENV.DATABASE_HOST] && value[ENV.DATABASE_PORT] && 
                             value[ENV.DATABASE_NAME] && value[ENV.DATABASE_USER] && 
                             value[ENV.DATABASE_PASSWORD];
  
  if (!hasDatabaseUrl && !hasIndividualParams) {
    return helpers.error('Either DATABASE_URL or all individual database parameters must be provided');
  }
  
  return value;
});
