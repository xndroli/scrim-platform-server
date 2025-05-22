// src/api/routes/oauth.routes.ts
import { Router } from 'express';
import { OAuthController } from '../controllers/oauth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const oauthController = new OAuthController();

router.get('/discord', authMiddleware, (req, res, next) => {
  oauthController.discordAuth(req, res, next);
});

router.get('/discord/callback', authMiddleware, (req, res, next) => {
  oauthController.discordCallback(req, res, next);
});

export default router;