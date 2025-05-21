// src/api/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';
import { db } from '../../db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';

declare module 'express' {
  interface Request {
    auth: {
      userId: string;
    };
  }
}

// Clerk middleware for authentication
export const requireAuth = ClerkExpressWithAuth();

// Middleware to attach user to request
export async function attachUser(req: Request, res: Response, next: NextFunction) {
  if (!req.auth || !req.auth.userId) {
    return next();
  }
  
  try {
    // Find user in our database
    const [user] = await db.select()
      .from(users)
      .where(eq(users.clerkId, req.auth.userId))
      .limit(1);
    
    if (user) {
      // Attach user to request
      (req as any).user = user;
    }
    
    next();
  } catch (error) {
    console.error('Error fetching user:', error);
    next();
  }
};