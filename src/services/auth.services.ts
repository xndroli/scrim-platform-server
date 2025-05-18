import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { usersRepository } from '../repositories/users.repository';
import { AppError } from '../utils/errors';
import { sendEmail } from '../utils/email';

export const authService = {
  async login(email: string, password: string) {
    // Find user
    const user = await usersRepository.findByEmail(email);
    
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401);
    }
    
    // Generate token
    const token = jwt.sign(
      { id: user.user_id, email: user.email },
      config.auth.jwtSecret,
      { expiresIn: config.auth.jwtExpiresIn }
    );
    
    return {
      success: true,
      token,
      user: {
        id: user.user_id,
        name: user.fullName,
        email: user.email,
      },
    };
  },
  
  async register(userData: any) {
    // Check if user exists
    const existingUser = await usersRepository.findByEmail(userData.email);
    
    if (existingUser) {
      throw new AppError('User already exists', 400);
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    // Create user
    const user = await usersRepository.create({
      ...userData,
      password: hashedPassword,
    });
    
    // Generate token
    const token = jwt.sign(
      { id: user.user_id, email: user.email },
      config.auth.jwtSecret,
      { expiresIn: config.auth.jwtExpiresIn }
    );
    
    return {
      success: true,
      token,
      user: {
        id: user.user_id,
        name: user.fullName,
        email: user.email,
      },
    };
  },
  
  async resetPassword(email: string) {
    // Find user
    const user = await usersRepository.findByEmail(email);
    
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Generate reset token
    const resetToken = jwt.sign(
      { id: user.user_id },
      config.auth.jwtSecret,
      { expiresIn: '1h' }
    );
    
    // Send email
    await sendEmail({
      to: email,
      subject: 'Password Reset',
      text: `Use this token to reset your password: ${resetToken}`,
    });
    
    return { success: true };
  },
};
