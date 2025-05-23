// src/api/middleware/auth.middleware.ts - Fixed for Better-auth
import { Request, Response, NextFunction } from 'express';
import { db } from '../../db';
import { session as sessionTable, user as userTable } from '../../db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import { TableConfig } from 'drizzle-orm/pg-core';

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
      session: sessionTable,
      user: userTable as PgTable<TableConfig>
    })
    .from(sessionTable)
    .innerJoin(userTable, eq(sessionTable.userId, userTable.id))
    .where(
      and(
        eq(sessionTable.token, token),
        gt(sessionTable.expiresAt, new Date())
      )
    )
    .limit(1);

    if (sessionData.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired session',
      });
    }

    const { session, user } = sessionData[0];

    // Attach user and session info to request
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      twoFactorEnabled: user.twoFactorEnabled || false,
    };
    
    req.session = {
      id: session.id,
      userId: session.userId,
      expiresAt: session.expiresAt,
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