import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { authValidators } from '../validators/auth.validators';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/register', validate(authValidators.register), (req, res, next) => {
  authController.register(req, res, next);
});

router.post('/login', validate(authValidators.login), (req, res, next) => {
  authController.login(req, res, next);
});

// Protected routes
router.get('/me', authMiddleware, (req, res, next) => {
  authController.getCurrentUser(req, res, next);
});

export default router;