// src/api/routes/index.ts
import { Router } from 'express';
import userRoutes from './user.routes';
import teamRoutes from './team.routes';
import scrimRoutes from './scrim.routes';
import { handleClerkWebhook } from './webhooks/clerk';
// Import other route modules as needed

const router = Router();

// Register routes
// Public routes (no auth needed)
router.post('/webhooks/clerk', () => {
  handleClerkWebhook;
});

// Protected routes (require auth)
router.use('/users', userRoutes);
router.use('/teams', teamRoutes);
router.use('/scrims', scrimRoutes);
// Register other routes as needed

export { router as routes };