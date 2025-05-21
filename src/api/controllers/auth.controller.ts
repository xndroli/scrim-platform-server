import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../../db';
import { users } from '../../db/schema';
import { eq, or } from 'drizzle-orm';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../../utils/jwt';
//import { sendEmail, emailTemplates } from '../../utils/email';

// Cookie configuration
const cookieOptions = {
  httpOnly: true,
  secure: true, // Always use secure in production
  sameSite: 'none' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/'
};

// Refresh token cookie options (longer expiry)
const refreshCookieOptions = {
  ...cookieOptions,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: '/api/auth/refresh-token' // Restrict path for added security
};


export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, email, password } = req.body;
      
      // Check if user already exists
      const existingUser = await db.select().from(users).where(
        or(
          eq(users.email, email),
          eq(users.username, username)
        )
      ).limit(1);
      
      if (existingUser.length > 0) {
        return res.status(400).json({
          status: 'error',
          message: 'User with this email or username already exists',
        });
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      
      // Create user
      const newUser = await db.insert(users)
        .values({
          email,
          username,
          passwordHash,
          updatedAt: new Date(),
        })
        .returning({
          id: users.id,
          email: users.email,
          username: users.username,
          createdAt: users.createdAt,
        });
      
      // Generate tokens
      const token = generateToken({
        userId: newUser[0].id,
        username: newUser[0].username,
      });

      const refreshToken = generateRefreshToken({
        userId: newUser[0].id,
      });

      // Set tokens as HttpOnly cookies
      res.cookie('auth-token', token, cookieOptions);
      res.cookie('refresh-token', refreshToken, refreshCookieOptions);
      
      // Send welcome email using QStash
      // try {
      //   await sendEmail({
      //     to: email,
      //     ...emailTemplates.welcome(username)
      //   });
      //   console.log(`Welcome email queued for ${username} (${email})`);
      // } catch (emailError) {
      //   // Log email error but don't fail registration
      //   console.error('Failed to queue welcome email:', emailError);
      // }

      // Return response
      res.status(201).json({
        status: 'success',
        message: 'User registered successfully',
        data: {
          user: newUser[0],
          token,
        },
      });

    } catch (error) {
      next(error);
    }
  }
  
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      
      // Find user
      const userResult = await db.select().from(users).where(eq(users.email, email)).limit(1);
      
      if (userResult.length === 0) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid credentials',
        });
      }
      
      const user = userResult[0];
      
      // Verify password
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      
      if (!isMatch) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid credentials',
        });
      }
      
      // Generate tokens
      const token = generateToken({
        userId: user.id,
        username: user.username,
      });

      const refreshToken = generateRefreshToken({
        userId: user.id,
      });

      // Set tokens as HttpOnly cookies
      res.cookie('auth-token', token, cookieOptions);
      res.cookie('refresh-token', refreshToken, refreshCookieOptions);
      
      // Update last login time
      await db.update(users)
        .set({ updatedAt: new Date() })
        .where(eq(users.id, user.id));
      
      res.status(200).json({
        status: 'success',
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            profileImage: user.profileImage,
          },
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      // Get refresh token from cookies
      const refreshToken = req.cookies['refresh-token'];
      
      if (!refreshToken) {
        return res.status(401).json({
          status: 'error',
          message: 'Refresh token not found',
        });
      }
      
      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);
      
      if (!decoded || !decoded.userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid refresh token',
        });
      }
      
      // Get user from database
      const userResult = await db.select().from(users).where(eq(users.id, decoded.userId)).limit(1);
      
      if (userResult.length === 0) {
        return res.status(401).json({
          status: 'error',
          message: 'User not found',
        });
      }
      
      const user = userResult[0];
      
      // Generate new tokens
      const newToken = generateToken({
        userId: user.id,
        username: user.username,
      });
      
      const newRefreshToken = generateRefreshToken({
        userId: user.id,
      });
      
      // Set new tokens as HttpOnly cookies
      res.cookie('auth-token', newToken, cookieOptions);
      res.cookie('refresh-token', newRefreshToken, refreshCookieOptions);
      
      res.status(200).json({
        status: 'success',
        message: 'Token refreshed successfully',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            profileImage: user.profileImage,
          },
          token: newToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      // Clear cookies
      res.clearCookie('auth-token', cookieOptions);
      res.clearCookie('refresh-token', { path: '/api/auth/refresh-token' });
      
      res.status(200).json({
        status: 'success',
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }
  
  async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Not authenticated',
        });
      }
      
      // Get user details
      const userResult = await db.select({
        id: users.id,
        username: users.username,
        email: users.email,
        profileImage: users.profileImage,
        createdAt: users.createdAt,
      }).from(users).where(eq(users.id, userId)).limit(1);
      
      if (userResult.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found',
        });
      }
      
      res.status(200).json({
        status: 'success',
        data: { user: userResult[0] },
      });
    } catch (error) {
      next(error);
    }
  }
}