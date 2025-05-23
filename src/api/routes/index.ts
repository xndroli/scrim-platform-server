// src/api/routes/index.ts
import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import teamRoutes from './team.routes';
import scrimRoutes from './scrim.routes';
import emailRoutes from './email.routes';
import integrationRoutes from './integration.routes';

const router = Router();

// Register routes
router.use('/auth', authRoutes); // This handles /api/auth/*
router.use('/users', userRoutes);
router.use('/teams', teamRoutes);
router.use('/scrims', scrimRoutes);
router.use('/webhooks', emailRoutes);
router.use('/integrations', integrationRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export { router as routes };