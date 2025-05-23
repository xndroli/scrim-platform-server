// src/api/routes/auth.routes.ts
import { Router } from 'express';
import { toNodeHandler } from "better-auth/node"
import { auth } from "../../lib/auth"

const router = Router();

// Handle all Better-auth routes
router.all('/*', toNodeHandler(auth));

export default router;