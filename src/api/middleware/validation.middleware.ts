import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '../../utils/error';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error: any) {
      if (error.errors) {
        const errorDetails = error.errors.map((err: any) => ({
          message: err.message,
          path: err.path,
        }));
        
        return next(new AppError('Validation error', 400, errorDetails));
      }
      
      next(new AppError('Validation error', 400));
    }
  };
};
