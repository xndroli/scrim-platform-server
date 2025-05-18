import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middleware/validation.middleware';
import { authValidators } from '../validators/auth.validators';

const router = Router();

router.post('/login', validate(authValidators.login), authController.login);
router.post('/register', validate(authValidators.register), authController.register);
router.post('/reset-password', validate(authValidators.resetPassword), authController.resetPassword);

export const authRoutes = router;
