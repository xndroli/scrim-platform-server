// src/api/middleware/auth.middleware.ts - Fixed for Better-auth
import { Request, Response, NextFunction } from 'express';
import { db } from '../../db';
import { session, user} from '../../db/schema';
import { eq, and, gt } from 'drizzle-orm';

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
    // Get the session token from cookies or authorization header
    let token: string | undefined;
    
    // Check cookies first (Better-auth uses cookies by default)
    const cookieToken = req.cookies?.['better-auth.session_token'];
    
    // Check Authorization header as fallback
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    // Use cookie token if available, otherwise use header token
    token = cookieToken || token;
    
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
    }

    // Verify the session exists in the database and is not expired
    const sessionData = await db.select({
      sessionId: session.id,
      sessionUserId: session.userId,
      sessionExpiresAt: session.expiresAt,
      sessionToken: session.token,
      userId: user.id,
      userName: user.username,
      userEmail: user.email,
      userRole: user.role,
      userEmailVerified: user.emailVerified,
      userTwoFactorEnabled: user.twoFactorEnabled,
    })
    .from(session)
    .innerJoin(user as any, eq(session.userId, user.id))
    .where(
      and(
        eq(session.token, token),
        gt(session.expiresAt, new Date())
      )
    )
    .limit(1);

    if (sessionData.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired session',
      });
    }

    const data = sessionData[0];

    // Attach user and session info to request
    req.user = {
      id: data.userId,
      name: data.userName,
      email: data.userEmail,
      role: data.userRole,
      emailVerified: data.userEmailVerified,
      twoFactorEnabled: data.userTwoFactorEnabled || false,
    };
    
    req.session = {
      id: data.sessionId,
      userId: data.sessionUserId,
      expiresAt: data.sessionExpiresAt,
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      status: 'error',
      message: 'Authentication failed',
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