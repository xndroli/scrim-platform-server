import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { validate } from '../middleware/validate.middleware';
import { userValidators } from '../validators/user.validators';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const userController = new UserController();

// All routes require authentication
router.use(authMiddleware as any);

// User routes
router.get(
  '/profile',
  (req, res, next) => {
    userController.getProfile(req, res, next)
});

router.patch(
  '/profile',
  validate(userValidators.updateProfile),
  (req, res, next) => {
    userController.updateProfile(req, res, next)
});

router.post(
  '/change-password',
  validate(userValidators.changePassword),
  (req, res, next) => {
    userController.changePassword(req, res, next)
});

export default router;