// src/api/routes/oauth.routes.ts
import { Router } from 'express';
import { OAuthController } from '../controllers/oauth.controller';

const router = Router();
const oauthController = new OAuthController();

router.post('/discord/auth', (req, res, next) => {
  oauthController.discordAuth(req, res, next);
});

router.get('/discord/callback', (req, res, next) => {
  oauthController.discordCallback(req, res, next);
});

export default router;