// src/api/routes/discord.routes.ts - Discord OAuth callback handler
import { Router } from 'express';
import { DiscordController } from '../controllers/discord.controller';

const router = Router();
const discordController = new DiscordController();

router.get('/callback', (req, res, next) => { 
  discordController.handleCallback(req, res, next);
});

export default router;