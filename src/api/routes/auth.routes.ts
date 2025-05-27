// src/api/routes/auth.routes.ts
import { Router } from 'express';
import { toNodeHandler } from "better-auth/node"
import { auth } from "../../lib/auth"

const router = Router();

// Debug logging
console.log('🔧 Setting up Better-auth routes...')

// Create the Better-auth handler
const authHandler = toNodeHandler(auth);

// Debug middleware to log all auth requests
router.use((req, res, next) => {
  console.log(`🔐 Auth route: ${req.method} ${req.originalUrl}`);
  console.log(`🔐 Path: ${req.path}`);
  console.log(`🔐 Headers:`, Object.keys(req.headers));
  next();
});

// Handle all Better-auth routes with wildcard
// The '/*' is important to catch all sub-routes
router.all('*', (req, res) => {
  console.log(`🔐 Forwarding to Better-auth: ${req.method} ${req.path}`);
  authHandler(req, res);
});

export default router;