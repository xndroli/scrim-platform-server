// src/api/routes/index.ts
import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import teamRoutes from './team.routes';
import scrimRoutes from './scrim.routes';
import webhookRoutes from './webhook.routes';
// Import other route modules as needed

const router = Router();

// Register routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/teams', teamRoutes);
router.use('/scrims', scrimRoutes);
router.use('/webhooks', webhookRoutes);
// Register other routes as needed

export { router as routes };