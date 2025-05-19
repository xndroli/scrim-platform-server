// src/api/controllers/webhook.controller.ts
import { Request, Response } from 'express';
import { verifySignature } from '@upstash/qstash/dist/nextjs';
import { sendEmailDirect, EmailOptions } from '../../utils/email';
import { config } from '../../config/environment';

export class WebhookController {
  // Handle email sending requests from QStash
  async handleEmailWebhook(req: Request, res: Response) {
    try {
      // Only verify signature in production
      if (config.NODE_ENV === 'production' && 
          config.QSTASH_CURRENT_SIGNING_KEY && 
          config.QSTASH_NEXT_SIGNING_KEY) {
        
        const signature = req.headers['upstash-signature'] as string;
        
        if (!signature) {
          return res.status(401).json({ error: 'Missing QStash signature' });
        }
        
        // If we're using the raw body middleware, we need to stringify the body again
        // since we parsed it in the middleware
        const bodyToVerify = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        
        try {
          const isValid = await verifySignature({
            signature,
            body: bodyToVerify,
            currentSigningKey: config.QSTASH_CURRENT_SIGNING_KEY,
            nextSigningKey: config.QSTASH_NEXT_SIGNING_KEY,
          });
          
          if (!isValid) {
            return res.status(401).json({ error: 'Invalid QStash signature' });
          }
        } catch (verifyError) {
          console.error('QStash signature verification error:', verifyError);
          return res.status(401).json({ error: 'QStash signature verification failed' });
        }
      }
      
      const emailOptions = req.body as EmailOptions;
      
      // Validate required fields
      if (!emailOptions.to || !emailOptions.subject || !emailOptions.html) {
        return res.status(400).json({ error: 'Missing required email fields' });
      }
      
      // Send the email directly
      const emailId = await sendEmailDirect(emailOptions);
      
      if (!emailId) {
        return res.status(500).json({ error: 'Failed to send email' });
      }
      
      return res.status(200).json({ 
        success: true, 
        emailId,
        message: 'Email sent successfully' 
      });
    } catch (error) {
      console.error('Email webhook error:', error);
      return res.status(500).json({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
}