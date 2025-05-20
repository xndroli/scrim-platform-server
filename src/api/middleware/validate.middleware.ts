import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { BadRequestError } from '../../utils/errors';

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body directly against schema
      await schema.parseAsync(req.body);
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod errors into a more readable structure
        const errors = error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message
        }));
        
        next(new BadRequestError(JSON.stringify(errors)));
      } else {
        next(error);
      }
    }
  };
};