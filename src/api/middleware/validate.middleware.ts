import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { BadRequestError } from '../../utils/errors';

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    console.log('Request body:', JSON.stringify(req.body));
    console.log('Request headers:', req.headers['content-type']);
    console.log('Schema structure:', schema);
    
    try {
      // Validate request against schema with fallback for undefined body
      await schema.parseAsync({
        body: req.body || {},
        query: req.query,
        params: req.params,
      });
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        console.log('Zod validation error:', error.errors);
        const errors = error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message
        }));
        
        next(new BadRequestError(JSON.stringify(errors)));
      } else {
        console.log('Non-Zod error:', error);
        next(error);
      }
    }
  };
};