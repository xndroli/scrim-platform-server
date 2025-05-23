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
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
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
          .where(eq(user.username, username))
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
          username: user.username,
          email: user.email,
          profileImage: user.profileImage,
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
//   async changePassword(req: Request, res: Response, next: NextFunction) {
//     try {
//       const userId = req.user!.id;
//       const { currentPassword, newPassword } = req.body;
      
//       // Get user with password hash
//       const userResult = await db.select()
//         .from(user)
//         .where(eq(user.id, userId))
//         .limit(1);
      
//       if (userResult.length === 0) {
//         return res.status(404).json({
//           status: 'error',
//           message: 'User not found',
//         });
//       }
      
//       const user = userResult[0];
      
//       // Verify current password
//       const isPasswordValid = await bcryptjs.compare(currentPassword, user.passwordHash);
      
//       if (!isPasswordValid) {
//         return res.status(401).json({
//           status: 'error',
//           message: 'Current password is incorrect',
//         });
//       }
      
//       // Hash new password
//       const salt = await bcryptjs.genSalt(10);
//       const newPasswordHash = await bcryptjs.hash(newPassword, salt);
      
//       // Update password
//       await db.update(user)
//         .set({
//           passwordHash: newPasswordHash,
//           updatedAt: new Date(),
//         })
//         .where(eq(user.id, userId));
      
//       res.status(200).json({
//         status: 'success',
//         message: 'Password changed successfully',
//       });
//     } catch (error) {
//       next(error);
//     }
//   }
// }