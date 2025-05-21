// src/api/routes/webhook.routes.ts
import express, { Router } from 'express';
import { WebhookController } from '../controllers/email.controller';

const router = Router();
const webhookController = new WebhookController();

// Special middleware for webhook endpoints that need raw body for signature verification
// This needs to be before the regular JSON body parser if you want to verify QStash signatures
router.use('/email', express.raw({ type: 'application/json' }), (req, res, next) => {
  // Convert raw body to JSON
  if (req.body && req.body.length) {
    req.body = JSON.parse(req.body.toString());
  }
  next();
});

// Email webhook endpoint for QStash
router.post('/email', async (req, res, next) => {
  try {
    await webhookController.handleEmailWebhook(req, res);
  } catch (error) {
    next(error);
  }
});

export default router;