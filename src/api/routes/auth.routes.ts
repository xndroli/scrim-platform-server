// src/api/routes/auth.routes.ts
import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middleware/validation.middleware';
import { authValidators } from '../validators/auth.validators';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/register', validate(authValidators.register), authController.register);
router.post('/login', validate(authValidators.login), authController.login);
router.post('/forgot-password', validate(authValidators.forgotPassword), authController.resetPassword);
router.post('/reset-password', validate(authValidators.resetPassword), authController.resetPassword);

// Protected routes
router.get('/me', authMiddleware, (req, res) => {
  res.status(200).json({ user: req.user });
});

export const authRoutes = router;
