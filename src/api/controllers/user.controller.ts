import { Request, Response, NextFunction } from 'express';
import { db } from '../../db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import bcryptjs from 'bcryptjs';

export class UserController {
  // Get current user profile
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      
      const userResult = await db.select({
        id: users.id,
        username: users.username,
        email: users.email,
        profileImage: users.profileImage,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
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
      const userId = req.user!.userId;
      const { username, profileImage } = req.body;
      
      // Check if user exists
      const userExists = await db.select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (userExists.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found',
        });
      }
      
      // Check if username is already taken (if updating username)
      if (username) {
        const userWithSameUsername = await db.select({ id: users.id })
          .from(users)
          .where(eq(users.username, username))
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
      
      const updatedUser = await db.update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          username: users.username,
          email: users.email,
          profileImage: users.profileImage,
          updatedAt: users.updatedAt,
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
      const userId = req.user!.userId;
      const { currentPassword, newPassword } = req.body;
      
      // Get user with password hash
      const userResult = await db.select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (userResult.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found',
        });
      }
      
      const user = userResult[0];
      
      // Verify current password
      const isPasswordValid = await bcryptjs.compare(currentPassword, user.passwordHash);
      
      if (!isPasswordValid) {
        return res.status(401).json({
          status: 'error',
          message: 'Current password is incorrect',
        });
      }
      
      // Hash new password
      const salt = await bcryptjs.genSalt(10);
      const newPasswordHash = await bcryptjs.hash(newPassword, salt);
      
      // Update password
      await db.update(users)
        .set({
          passwordHash: newPasswordHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
      
      res.status(200).json({
        status: 'success',
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}