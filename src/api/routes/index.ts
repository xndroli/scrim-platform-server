import { Router } from 'express';
import authRoutes from './auth.routes';
import teamRoutes from './team.routes';
// Import other route modules as needed

const router = Router();

// Register routes
router.use('/auth', authRoutes);
router.use('/teams', teamRoutes);
// Register other routes as needed

export { router as routes };