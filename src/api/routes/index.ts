// src/api/routes/index.ts
import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import teamRoutes from './team.routes';
import scrimRoutes from './scrim.routes';
import emailRoutes from './email.routes';
import integrationRoutes from './integration.routes';

const router = Router();

// Debug logging middleware
router.use((req, res, next) => {
  console.log(`API Request: ${req.method} ${req.path}`);
  console.log(`Full URL: ${req.originalUrl}`);
  next();
});

// Register routes
// Auth routes first and handle all /auth/* routes
router.use('/auth', authRoutes); // This 

// Other routes
// router.use('/users', userRoutes);
// router.use('/teams', teamRoutes);
// router.use('/scrims', scrimRoutes);
// router.use('/webhooks', emailRoutes);
// router.use('/integrations', integrationRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug route to check if routes are working
router.get('/debug', (req, res) => {
  res.json({ 
    message: 'API routes are working',
    routes: ['/auth', '/users', '/teams', '/scrims', '/webhooks', '/integrations']
  });
});

export { router as routes };