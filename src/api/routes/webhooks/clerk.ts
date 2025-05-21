// src/api/routes/webhooks/clerk.ts
import { Request, Response } from 'express';
import { Webhook } from 'svix';
import { db } from '../../../db';
import { users } from '../../../db/schema';
import { eq } from 'drizzle-orm';

// Handle Clerk webhooks
export async function handleClerkWebhook(req: Request, res: Response) {
  // Verify webhook signature
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('Clerk webhook secret is not set');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  // Get the headers
  const svix_id = req.headers['svix-id'] as string;
  const svix_timestamp = req.headers['svix-timestamp'] as string;
  const svix_signature = req.headers['svix-signature'] as string;

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({ error: 'Missing svix headers' });
  }

  // Create a new Svix instance with your secret
  const webhook = new Webhook(webhookSecret);
  let payload;

  try {
    // Verify the webhook and get the payload
    payload = webhook.verify(JSON.stringify(req.body), {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as { type: string; data: object };;
  } catch (error) {
    console.error('Error verifying webhook:', error);
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  // Process the webhook
  const { type, data } = payload;

  switch (type) {
    case 'user.created':
      await handleUserCreated(data);
      break;
    case 'user.updated':
      await handleUserUpdated(data);
      break;
    // Add other event types as needed
  }

  return res.status(200).json({ success: true });
}

// Handle user created event
async function handleUserCreated(data: any) {
  const { id: clerkId, email_addresses, username, image_url } = data;
  
  // Get primary email
  const primaryEmail = email_addresses.find((email: any) => email.id === data.primary_email_address_id);
  const email = primaryEmail ? primaryEmail.email_address : '';
  
  // Create user in your database
  try {
    await db.insert(users).values({
      id: clerkId,
      clerkId,
      email,
      username: username || email.split('@')[0], // Fallback username
      profileImageUrl: image_url,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    console.log(`User created: ${clerkId}`);
  } catch (error) {
    console.error('Error creating user:', error);
  }
}

// Handle user updated eventw
async function handleUserUpdated(data: any) {
  const { id: clerkId, email_addresses, username, image_url } = data;
  
  // Get primary email
  const primaryEmail = email_addresses.find((email: any) => email.id === data.primary_email_address_id);
  const email = primaryEmail ? primaryEmail.email_address : '';
  
  // Update user in your database
  try {
    const existingUser = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
    
    if (existingUser.length === 0) {
      // Create user if it doesn't exist
      return await handleUserCreated(data);
    }
    
    await db.update(users)
      .set({
        email,
        username: username || email.split('@')[0],
        profileImageUrl: image_url,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkId, clerkId));
    
    console.log(`User updated: ${clerkId}`);
  } catch (error) {
    console.error('Error updating user:', error);
  }
}