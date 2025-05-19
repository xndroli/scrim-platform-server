// src/api/routes/index.ts
import { Router } from 'express';
import authRoutes from './auth.routes';
import teamRoutes from './team.routes';
import webhookRoutes from './webhook.routes';
// Import other route modules as needed

const router = Router();

// Register routes
router.use('/auth', authRoutes);
router.use('/teams', teamRoutes);
router.use('/webhooks', webhookRoutes);
// Register other routes as needed

export { router as routes };