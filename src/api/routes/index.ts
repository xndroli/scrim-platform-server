// src/api/routes/index.ts
import { Router } from 'express';
// import authRoutes from './auth.routes';
// import userRoutes from './user.routes';
// import teamRoutes from './team.routes';
// import scrimRoutes from './scrim.routes';
// import emailRoutes from './email.routes';
// import integrationRoutes from './integration.routes';

const router = Router();

// Debug logging middleware
router.use((req, res, next) => {
  console.log(`API Request: ${req.method} ${req.originalUrl}`);
  console.log(`📡 Path: ${req.path}`);
  console.log(`📡 Body:`, req.body);
  next();
});

// Register routes
// Auth routes first and handle all /auth/* routes
// console.log('🔧 Registering auth routes at /auth/*');
// router.use('/auth', authRoutes);

// Other routes
// router.use('/users', userRoutes);
// router.use('/teams', teamRoutes);
// router.use('/scrims', scrimRoutes);
// router.use('/webhooks', emailRoutes);
// router.use('/integrations', integrationRoutes);

// Health check - simple endpoint first
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'API is running'
  });
});

// Debug route to check if routes are working
router.get('/debug', (req, res) => {
  res.json({ 
    message: 'API routes are working',
    availableRoutes: [
      'GET /api/health',
      'GET /api/debug', 
      'POST /api/auth/sign-up/email',
      'POST /api/auth/sign-in/email',
      'GET /api/auth/session',
      'POST /api/auth/sign-out'
    ],
    timestamp: new Date().toISOString()
  });
});

// Catch-all for undefined routes
router.use('*', (req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    status: 'error',
    message: 'API route not found',
    path: req.originalUrl,
    availableRoutes: [
      'GET /api/health',
      'GET /api/debug',
      'GET /api/auth-test',
      'POST /api/auth/sign-up/email',
      'POST /api/auth/sign-in/email',
      'GET /api/auth/session',
      'POST /api/auth/sign-out'
    ]
  });
});

export { router as routes };