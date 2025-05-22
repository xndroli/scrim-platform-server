// src/api/middleware/auth.middleware.ts - Updated for Better-auth
import { Request, Response, NextFunction } from 'express';
import { auth } from '../../lib/auth';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        email: string;
        role?: string | null;
        emailVerified: boolean;
        twoFactorEnabled: boolean;
      };
      session?: {
        id: string;
        userId: string;
        expiresAt: Date;
      };
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get session from Better-auth
    const session = await auth.api.getSession({
      headers: req.headers as any,
    });

    if (!session) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
    }

    // Attach user and session info to request
    req.user = session.user as Express.Request['user'];;
    req.session = session.session;
    
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid session',
    });
  }
};

// Role-based middleware
export const requireRole = (requiredRole: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
    }

    if (req.user.role !== requiredRole && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions',
      });
    }

    next();
  };
};

// Admin middleware
export const requireAdmin = requireRole('admin');

// Email verification middleware
export const requireEmailVerification = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required',
    });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({
      status: 'error',
      message: 'Email verification required',
    });
  }

  next();
};