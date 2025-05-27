// src/api/routes/auth.routes.ts
import { Router } from 'express';
import { toNodeHandler } from "better-auth/node"
import { auth } from "../../lib/auth"

const router = Router();

// Debug logging
console.log('Setting up Better-auth routes...')

// Create the Better-auth handler
const authHandler = toNodeHandler(auth);

// Handle all Better-auth routes with wildcard
// The '/*' is important to catch all sub-routes
router.all('/*any', authHandler);

export default router;