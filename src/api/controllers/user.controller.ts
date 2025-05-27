import { Request, Response, NextFunction } from 'express';
import { db } from '../../db';
import { user } from '../../db/schema';
import { eq } from 'drizzle-orm';

export class UserController {
  // Get current user profile
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      
      const userResult = await db.select({
        id: user.id,
        username: user.name,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
      
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
  
  // Update user profile
  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { username, profileImage } = req.body;
      
      // Check if user exists
      const userExists = await db.select({ id: user.id })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);
      
      if (userExists.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found',
        });
      }
      
      // Check if username is already taken (if updating username)
      if (username) {
        const userWithSameUsername = await db.select({ id: user.id })
          .from(user)
          .where(eq(user.name, username))
          .limit(1);
        
        if (userWithSameUsername.length > 0 && userWithSameUsername[0].id !== userId) {
          return res.status(400).json({
            status: 'error',
            message: 'Username already taken',
          });
        }
      }
      
      // Update user profile
      const updateData: any = { updatedAt: new Date() };
      if (username) updateData.username = username;
      if (profileImage) updateData.profileImage = profileImage;
      
      const updatedUser = await db.update(user)
        .set(updateData)
        .where(eq(user.id, userId))
        .returning({
          id: user.id,
          username: user.name,
          email: user.email,
          updatedAt: user.updatedAt,
        });
      
      res.status(200).json({
        status: 'success',
        message: 'Profile updated successfully',
        data: { user: updatedUser[0] },
      });
    } catch (error) {
      next(error);
    }
  }
  
// Change password
  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      // const userId = req.user!.id;
      // const { currentPassword, newPassword } = req.body;
      
      // For Better-auth, password change should be handled through auth routes
      // This is just a placeholder that returns an appropriate response
      return res.status(400).json({
        status: 'error',
        message: 'Please use the /auth/change-password endpoint for password changes',
      });
    } catch (error) {
      next(error);
    }
  }
};
