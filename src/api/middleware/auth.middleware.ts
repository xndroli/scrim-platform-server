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
  // Get token from cookie first
  const cookieToken = req.cookies['auth-token'];
  
  // Then try to get from Authorization header as fallback
  const authHeader = req.headers.authorization;
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  
  // Use token from cookie or header
  const token = cookieToken || headerToken;

  console.log('Token found:', token ? 'Yes' : 'No');
  
  if (!token) {
    throw new UnauthorizedError('Authentication required');
  };
  
  // Verify token
  const decoded = verifyToken(token);
  
  if (!decoded) {
    throw new UnauthorizedError('Invalid or expired token');
  };
}