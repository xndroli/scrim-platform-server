import { Router, Request, Response, NextFunction } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { authValidators } from '../validators/auth.validators';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const authController = new AuthController();

// Body existence check middleware
const checkRequestBody = (req: Request, res: Response, next: NextFunction): void => {
  console.log('Request body in checkRequestBody:', req.body);
  
  if (!req.body || Object.keys(req.body).length === 0) {
    console.error('Body parsing failed - request body is empty or undefined');
    res.status(400).json({
      status: 'error', 
      message: 'Missing or empty request body'
    });
    return;
  }
  next();
};

// Public routes with body check middleware
router.post('/register', 
  checkRequestBody,
  validate(authValidators.register), 
  (req, res, next) => {
    authController.register(req, res, next);
  }
);

router.post('/login', 
  checkRequestBody,
  validate(authValidators.login), 
  (req, res, next) => {
    authController.login(req, res, next);
  }
);

// Token refresh route - no auth required, uses refresh token from cookie
router.post('/refresh-token', 
  (req, res, next) => {
    authController.refreshToken.bind(authController);
  });

// Logout route
router.post('/logout', authController.logout.bind(authController));

// Protected routes
router.get('/me', authMiddleware, (req, res, next) => {
  authController.getCurrentUser(req, res, next);
});

export default router;