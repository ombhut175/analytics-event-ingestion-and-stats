// Environment Variables
export enum ENV {
  NODE_ENV = 'NODE_ENV',
  PORT = 'PORT',
  SWAGGER_USER = 'SWAGGER_USER',
  SWAGGER_PASSWORD = 'SWAGGER_PASSWORD',
  SWAGGER_ENABLED = 'SWAGGER_ENABLED',
  SWAGGER_UI_DEEP_LINKING = 'SWAGGER_UI_DEEP_LINKING',
  SWAGGER_UI_DOC_EXPANSION = 'SWAGGER_UI_DOC_EXPANSION',
  SWAGGER_UI_FILTER = 'SWAGGER_UI_FILTER',
  COOKIE_DOMAIN = 'COOKIE_DOMAIN',
  
  // Database Configuration
  DATABASE_URL = 'DATABASE_URL',
  DATABASE_HOST = 'DATABASE_HOST',
  DATABASE_PORT = 'DATABASE_PORT',
  DATABASE_NAME = 'DATABASE_NAME',
  DATABASE_USER = 'DATABASE_USER',
  DATABASE_PASSWORD = 'DATABASE_PASSWORD',
  
  // Redis Configuration (for BullMQ)
  REDIS_HOST = 'REDIS_HOST',
  REDIS_PORT = 'REDIS_PORT',
  REDIS_PASSWORD = 'REDIS_PASSWORD',
  REDIS_DB = 'REDIS_DB',
}

// Common Messages
export enum MESSAGES {
  // Generic
  SUCCESS = 'Success',
  CREATED = 'Created',
  UPDATED = 'Updated',
  DELETED = 'Deleted',
  
  // Errors
  UNEXPECTED_ERROR = 'Unexpected error occurred',
  VALIDATION_ERROR = 'Validation error',
  NOT_FOUND = 'Resource not found',
  USER_NOT_FOUND = 'User not found',
  UNAUTHORIZED = 'Unauthorized',
  FORBIDDEN = 'Forbidden',
  
  // Database
  DATABASE_CONNECTION_ERROR = 'Failed to connect to database',
  DATABASE_QUERY_ERROR = 'Database query failed',
}

// API Response Messages
export enum API_MESSAGES {
  USERS_FETCHED = 'Users fetched successfully',
  USER_CREATED = 'User created successfully',
  USER_UPDATED = 'User updated successfully',
  USER_DELETED = 'User deleted successfully',
}

// Table Names (for future use)
export enum TABLES {
  USERS = 'users',
  TASKS = 'tasks',
  PROFILES = 'profiles',
}

// Queue Names (for BullMQ usage)
export enum QUEUES {
  ANALYTICS_EVENTS = 'analytics-events',
  JOBS = 'jobs',
  EMAILS = 'emails',
  NOTIFICATIONS = 'notifications',
}

// Cookie Keys
export enum COOKIES {
  AUTH_TOKEN = 'auth_token',
}
