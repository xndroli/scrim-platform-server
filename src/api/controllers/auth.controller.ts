import { Request, Response, NextFunction } from 'express';
import { authService } from '../../services/auth.services';
import { AppError } from '../../utils/error';

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
  
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body);
      
      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },
  
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      await authService.resetPassword(email);
      
      return res.status(200).json({
        success: true,
        message: 'Password reset email sent',
      });
    } catch (error) {
      next(error);
    }
  },
};
