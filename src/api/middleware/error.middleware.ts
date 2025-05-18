import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { config } from '../../config';

export const errorMiddleware = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error(err);
  
  // Default error
  let statusCode = 500;
  let message = 'Something went wrong';
  let errors: any = undefined;
  
  // AppError handling
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  }
  
  // Validation error
  if (err.name === 'ZodError') {
    statusCode = 400;
    message = 'Validation error';
    errors = err;
  }
  
  // JWT error
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  
  // Send response
  res.status(statusCode).json({
    success: false,
    message,
    errors,
    stack: config.server.nodeEnv === 'development' ? err.stack : undefined,
  });
};
