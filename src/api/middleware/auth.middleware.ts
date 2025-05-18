import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { AppError } from '../../utils/errors';
import { usersRepository } from '../../repositories/users.repository';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.split(' ')[1] 
      : null;
    
    if (!token) {
      return next(new AppError('Not authenticated', 401));
    }
    
    // Verify token
    const decoded = jwt.verify(token, config.auth.jwtSecret) as jwt.JwtPayload;
    
    // Check if user exists
    const user = await usersRepository.findById(decoded.id);
    
    if (!user) {
      return next(new AppError('User not found', 404));
    }
    
    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    next(new AppError('Invalid token', 401));
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }
    
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Not authorized', 403));
    }
    
    next();
  };
};
