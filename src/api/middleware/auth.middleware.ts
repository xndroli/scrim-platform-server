// // src/api/middleware/auth.middleware.ts - Fixed for Better-auth
// import { Request, Response, NextFunction } from 'express';
// import { auth } from '../../lib/auth';
// import { fromNodeHeaders } from 'better-auth/node';

// declare global {
//   namespace Express {
//     interface Request {
//       user?: {
//         id: string;
//         name: string;
//         email: string;
//         role?: string | null;
//         emailVerified: boolean;
//         // twoFactorEnabled: boolean;
//       };
//       session?: {
//         id: string;
//         userId: string;
//         expiresAt: Date;
//       };
//     }
//   }
// }

// export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     // Use Better-auth's built-in session verification
//     const session = await auth.api.getSession({
//       headers: fromNodeHeaders(req.headers),
//     });

//     if (!session) {
//       return res.status(401).json({
//         status: 'error',
//         message: 'Authentication required',
//       });
//     }

//     // Attach user and session info to request
//     req.user = {
//       id: session.user.id,
//       name: session.user.name,
//       email: session.user.email,
//       role: session.user.role,
//       emailVerified: session.user.emailVerified,
//       // twoFactorEnabled: session.user.twoFactorEnabled ?? false,
//     };
    
//     req.session = {
//       id: session.session.id,
//       userId: session.session.userId,
//       expiresAt: session.session.expiresAt,
//     };
    
//     next();
//   } catch (error) {
//     console.error('Auth middleware error:', error);
//     return res.status(401).json({
//       status: 'error',
//       message: 'Authentication failed',
//     });
//   }
// };

// // Role-based middleware
// export const requireRole = (requiredRole: string) => {
//   return async (req: Request, res: Response, next: NextFunction) => {
//     if (!req.user) {
//       return res.status(401).json({
//         status: 'error',
//         message: 'Authentication required',
//       });
//     }

//     if (req.user.role !== requiredRole && req.user.role !== 'admin') {
//       return res.status(403).json({
//         status: 'error',
//         message: 'Insufficient permissions',
//       });
//     }

//     next();
//   };
// };

// // Admin middleware
// export const requireAdmin = requireRole('admin');

// // Email verification middleware
// export const requireEmailVerification = async (req: Request, res: Response, next: NextFunction) => {
//   if (!req.user) {
//     return res.status(401).json({
//       status: 'error',
//       message: 'Authentication required',
//     });
//   }

//   if (!req.user.emailVerified) {
//     return res.status(403).json({
//       status: 'error',
//       message: 'Email verification required',
//     });
//   }

//   next();
// };