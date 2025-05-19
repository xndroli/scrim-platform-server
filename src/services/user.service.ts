import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import bcryptjs from 'bcryptjs';

export const userService = {
  async findById(userId: number) {
    const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return userResult.length > 0 ? userResult[0] : null;
  },
  
  async findByEmail(email: string) {
    const userResult = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return userResult.length > 0 ? userResult[0] : null;
  },
  
  async findByUsername(username: string) {
    const userResult = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return userResult.length > 0 ? userResult[0] : null;
  },
  
  async updateProfile(userId: number, data: { username?: string, profileImage?: string }) {
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (data.username) updateData.username = data.username;
    if (data.profileImage) updateData.profileImage = data.profileImage;
    
    const updatedUser = await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        username: users.username,
        email: users.email,
        profileImage: users.profileImage,
      });
    
    return updatedUser.length > 0 ? updatedUser[0] : null;
  },
  
  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    // Get user with password hash
    const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (userResult.length === 0) {
      throw new Error('User not found');
    }
    
    const user = userResult[0];
    
    // Verify current password
    const isPasswordValid = await bcryptjs.compare(currentPassword, user.passwordHash);
    
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
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
    
    return true;
  },
};