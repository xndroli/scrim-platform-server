import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../../db';
import { users } from '../../db/schema';
import { eq, or } from 'drizzle-orm';
import { generateToken } from '../../utils/jwt';

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
      
      // Generate token
      const token = generateToken({
        userId: newUser[0].id,
        username: newUser[0].username,
      });
      
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
      
      // Generate token
      const token = generateToken({
        userId: user.id,
        username: user.username,
      });
      
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