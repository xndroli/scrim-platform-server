// src/api/routes/auth.routes.ts
import { Router } from 'express';
import { toNodeHandler } from "better-auth/node"
import { auth } from "../../lib/auth"

const router = Router();

// Debug logging
console.log('Setting up Better-auth routes...')

// Handle all Better-auth routes
// The '/*' is important to catch all sub-routes
router.all('*', (req, res, next) => {
  console.log(`Auth route hit: ${req.method} ${req.originalUrl}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  
  // Call the Better-auth handler
  const handler = toNodeHandler(auth);
  return handler(req, res);
});

// Also handle the root /auth path
router.all('/', (req, res, next) => {
  console.log(`Auth root route hit: ${req.method} ${req.originalUrl}`);
  const handler = toNodeHandler(auth);
  return handler(req, res);
});

export default router;