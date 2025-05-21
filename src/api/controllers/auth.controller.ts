// src/api/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { db } from '../../db';
import { users } from '../../db/schema';
import { syncPlayerStats } from '../../services/apex.service';
import { Webhook } from 'svix';

export class AuthController {
  async handleClerkWebhook(req: Request, res: Response) {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    
    // Verify webhook signature
    const svixHeaders = {
      'svix-id': req.headers['svix-id'] as string,
      'svix-timestamp': req.headers['svix-timestamp'] as string,
      'svix-signature': req.headers['svix-signature'] as string,
    };
    
    const wh = new Webhook(webhookSecret);
    const evt = wh.verify(JSON.stringify(req.body), svixHeaders);
    
    // Handle different webhook events
    switch (evt.type) {
      case 'user.created':
        await this.syncUserToDatabase(evt.data);
        break;
      case 'user.updated':
        await this.updateUserInDatabase(evt.data);
        break;
      case 'user.deleted':
        await this.deleteUserFromDatabase(evt.data);
        break;
    }
    
    res.json({ success: true });
  }
  
  async getCurrentUser(req: Request, res: Response) {
    try {
      const user = await clerkClient.users.getUser(req.user.id);
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get user' });
    }
  }
  
  async syncApexStats(req: Request, res: Response) {
    try {
      const { platform, username } = req.body;
      const stats = await syncPlayerStats(req.user.id, platform, username);
      res.json({ stats });
    } catch (error) {
      res.status(500).json({ error: 'Failed to sync Apex stats' });
    }
  }
  
  private async syncUserToDatabase(userData: any) {
    const { id, email_addresses, username, profile_image_url } = userData;
    
    await db.insert(users).values({
      clerkId: id,
      email: email_addresses[0].email_address,
      username: username || email_addresses[0].email_address.split('@')[0],
      profileImage: profile_image_url,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  
  private async updateUserInDatabase(userData: any) {
    // Similar to previous implementation
  }
  
  private async deleteUserFromDatabase(userData: any) {
    // Similar to previous implementation
  }
}
