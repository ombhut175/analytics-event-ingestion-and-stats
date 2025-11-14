export const successResponse = (data: any, message = 'Success') => ({
  statusCode: 200,
  success: true,
  message,
  data,
});

export const createdResponse = (data: any, message = 'Created') => ({
  statusCode: 201,
  success: true,
  message,
  data,
});

export const updatedResponse = (data: any, message = 'Updated') => ({
  statusCode: 200,
  success: true,
  message,
  data,
});

export const deletedResponse = (message = 'Deleted') => ({
  statusCode: 200,
  success: true,
  message,
  data: null,
});

export const errorResponse = (statusCode: number, message: string, path?: string) => ({
  statusCode,
  message,
  timestamp: new Date().toISOString(),
  path,
});
