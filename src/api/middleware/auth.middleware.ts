import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../../utils/errors';
import { verifyToken, TokenPayload } from '../../utils/jwt';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication required');
    }
    
    // Extract and verify token
    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    
    // Attach user to request object
    req.user = payload;
    
    next();
  } catch (error) {
    next(error);
  }
};