// utils/jwt.ts
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';

interface TokenPayload {
  userId: number;
  username?: string;
  role?: string;
}

interface RefreshTokenPayload {
  userId: number;
  version?: number; // Optional version field for token invalidation
}

// Parse the JWT expiration time from config
const jwtExpiresIn = parseInt(config.JWT_EXPIRES_IN, 10);

// Access token using your existing configuration
export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: jwtExpiresIn,
  });
};

// Refresh token - longer lived (30 days or configurable)
export const generateRefreshToken = (payload: RefreshTokenPayload): string => {
  // Use a refresh token specific expiry if available, otherwise default to 30 days
  const refreshExpiresIn = config.JWT_REFRESH_EXPIRES_IN 
    ? parseInt(config.JWT_REFRESH_EXPIRES_IN, 10) 
    : 60 * 60 * 24 * 30; // 30 days in seconds
  
  // Use a separate refresh secret if available, otherwise use the main secret
  const refreshSecret = config.JWT_REFRESH_SECRET || config.JWT_SECRET;
  
  return jwt.sign(payload, refreshSecret, {
    expiresIn: refreshExpiresIn,
  });
};

// Updated to match your implementation style but adding null return option
export const verifyToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, config.JWT_SECRET) as TokenPayload;
  } catch (error) {
    // Either throw an error (original behavior) or return null (new behavior)
    if (config.JWT_THROW_ERROR !== 'false') {
      throw new Error('Invalid or expired token');
    }
    return null;
  }
};

// Verify refresh token
export const verifyRefreshToken = (token: string): RefreshTokenPayload | null => {
  try {
    // Use a separate refresh secret if available, otherwise use the main secret
    const refreshSecret = config.JWT_REFRESH_SECRET || config.JWT_SECRET;
    
    return jwt.verify(token, refreshSecret) as RefreshTokenPayload;
  } catch (error) {
    return null;
  }
};