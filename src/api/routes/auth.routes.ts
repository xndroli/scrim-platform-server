// src/api/routes/auth.routes.ts
import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { verifyClerkSession } from '../middleware/clerk.middleware';

const router = Router();
const authController = new AuthController();

// Clerk webhook handler
router.post('/webhook', authController.handleClerkWebhook);

// Protected routes that require Clerk session
router.use(verifyClerkSession);
router.get('/me', authController.getCurrentUser);
router.post('/sync-apex', authController.syncApexStats);

export default router;