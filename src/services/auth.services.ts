import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail, emailTemplates } from '../utils/email';

// Helper function for JWT signing
function signJwt(payload: any, expiresIn: string | number): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: Number(expiresIn) });

}

export const authService = {
  async login(email: string, password: string) {
    // Find user
    const userResults = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (userResults.length === 0) {
      throw new Error('Invalid credentials');
    }
    
    const user = userResults[0];
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }
    
    // Generate token
    const token = signJwt(
      { userId: user.id, username: user.username },
      config.JWT_EXPIRES_IN || '7d'
    );
    
    // Update last login time
    await db.update(users)
      .set({ updatedAt: new Date() })
      .where(eq(users.id, user.id));
    
    return {
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
      },
    };
  },
  
  async register(userData: { username: string, email: string, password: string }) {
    // Check if user exists
    const existingUsers = await db.select()
      .from(users)
      .where(eq(users.email, userData.email))
      .limit(1);
    
    if (existingUsers.length > 0) {
      throw new Error('User already exists');
    }
    
    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(userData.password, saltRounds);
    
    // Create user
    const newUser = await db.insert(users)
      .values({
        email: userData.email,
        username: userData.username,
        passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({
        id: users.id,
        username: users.username,
        email: users.email,
      });
    
    // Generate token
    const token = signJwt(
      { userId: newUser[0].id, username: newUser[0].username },
      config.JWT_EXPIRES_IN || '7d'
    );
    
    // Send welcome email
    try {
      await sendEmail({
        to: userData.email,
        ...emailTemplates.welcome(userData.username)
      });
    } catch (emailError) {
      // Log but don't fail registration if email fails
      console.error('Failed to send welcome email:', emailError);
    }
    
    return {
      success: true,
      token,
      user: newUser[0],
    };
  },
  
  async resetPassword(email: string) {
    // Find user
    const userResults = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (userResults.length === 0) {
      throw new Error('User not found');
    }
    
    const user = userResults[0];
    
    // Generate reset token (shorter expiration for security)
    const resetToken = signJwt(
      { userId: user.id, purpose: 'password_reset' },
      '30m'  // 30 minutes expiration
    );
    
    // Create reset link - get base URL from config or use fallback
    const baseUrl = config.NODE_ENV === 'production' 
      ? process.env.CLIENT_URL || 'https://your-app-url.com' 
      : 'http://localhost:3000';
    
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
    
    // Send email using template
    try {
      await sendEmail({
        to: user.email,
        ...emailTemplates.passwordReset(resetLink, user.id)
      });
      
      return { success: true, message: 'Password reset link sent' };
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  },
  
  async verifyResetToken(token: string) {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: number, purpose: string };
      
      // Verify this is indeed a password reset token
      if (decoded.purpose !== 'password_reset') {
        throw new Error('Invalid token purpose');
      }
      
      // Check if user exists
      const userResults = await db.select()
        .from(users)
        .where(eq(users.id, decoded.userId))
        .limit(1);
      
      if (userResults.length === 0) {
        throw new Error('User not found');
      }
      
      return { success: true, userId: decoded.userId };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      throw new Error('Invalid token');
    }
  },
  
  async updatePassword(userId: number, newPassword: string) {
    // Hash new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    
    // Update user password
    const updatedUser = await db.update(users)
      .set({ 
        passwordHash,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning({ id: users.id });
    
    if (updatedUser.length === 0) {
      throw new Error('Failed to update password');
    }
    
    return { success: true, message: 'Password updated successfully' };
  }
};