// src/api/controllers/oauth.controller.ts
import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { randomUUID } from 'crypto';
import { db } from '../../db';
import { user } from '../../db/schema-test';
import { eq } from 'drizzle-orm';
import { config } from '../../config/environment';

// Extend Request type to include state storage
declare global {
  namespace Express {
    interface Request {
      oauthState?: string;
    }
  }
}

export class OAuthController {
  async discordAuth(req: Request, res: Response, next: NextFunction) {
    try {
      const state = randomUUID();
      
      // Store state in a cookie (since we don't have sessions)
      res.cookie('discord_oauth_state', state, {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 10 * 60 * 1000, // 10 minutes
      });
      
      const params = new URLSearchParams({
        client_id: config.DISCORD_CLIENT_ID,
        redirect_uri: config.DISCORD_REDIRECT_URI || `${config.NODE_ENV === 'production' ? 'https' : 'http'}://${req.get('host')}/api/oauth/discord/callback`,
        response_type: 'code',
        scope: 'identify guilds',
        state,
      });
      
      res.redirect(`https://discord.com/oauth2/authorize?${params}`);
    } catch (error) {
      next(error);
    }
  }
  
  async discordCallback(req: Request, res: Response, next: NextFunction) {
    const { code, state } = req.query;
    
    // Get state from cookie
    const storedState = req.cookies?.discord_oauth_state;
    
    // Clear the state cookie
    res.clearCookie('discord_oauth_state');
    
    // Verify state
    if (!state || state !== storedState) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Invalid state parameter' 
      });
    }
    
    if (!code) {
      return res.status(400).json({ 
        status: 'error',
        message: 'No authorization code provided' 
      });
    }
    
    try {
      // Exchange code for token
      const tokenResponse = await axios.post(
        'https://discord.com/api/oauth2/token',
        new URLSearchParams({
          client_id: config.DISCORD_CLIENT_ID,
          client_secret: config.DISCORD_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code: code as string,
          redirect_uri: config.DISCORD_REDIRECT_URI || `${config.NODE_ENV === 'production' ? 'https' : 'http'}://${req.get('host')}/api/oauth/discord/callback`,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      
      const { access_token } = tokenResponse.data;
      
      // Get user info
      const userResponse = await axios.get('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });
      
      const discordUser = userResponse.data;
      
      // Check if Discord ID is already linked to a user
      const existingUser = await db.select()
        .from(user)
        .where(eq(user.discordId, discordUser.id))
        .limit(1);
      
      if (existingUser.length > 0) {
        // Discord account already linked
        if (req.user && existingUser[0].id !== req.user.id) {
          // Discord linked to a different account
          return res.redirect(`${process.env.NEXT_PUBLIC_CLIENT_URL || 'http://localhost:3000'}/settings/integrations?error=discord_already_linked`);
        }
      }
      
      // If user is authenticated, update their Discord info
      if (req.user) {
        await db.update(user)
          .set({
            discordId: discordUser.id,
            discordUsername: `${discordUser.username}${discordUser.discriminator !== '0' ? '#' + discordUser.discriminator : ''}`,
            discordAvatar: discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : null,
            discordLinkedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(user.id, req.user.id));
        
        // Try to add user to Discord server if bot has permissions
        await this.addUserToServer(discordUser.id, access_token);
        
        res.redirect(`${process.env.NEXT_PUBLIC_CLIENT_URL || 'http://localhost:3000'}/settings/integrations?discord=linked`);
      } else {
        // User not authenticated, store Discord info in cookie for later
        const discordData = {
          id: discordUser.id,
          username: `${discordUser.username}${discordUser.discriminator !== '0' ? '#' + discordUser.discriminator : ''}`,
          avatar: discordUser.avatar,
        };
        
        res.cookie('pending_discord_link', JSON.stringify(discordData), {
          httpOnly: true,
          secure: config.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 60 * 1000, // 30 minutes
        });
        
        res.redirect(`${process.env.NEXT_PUBLIC_CLIENT_URL || 'http://localhost:3000'}/login?discord=pending`);
      }
    } catch (error: any) {
      console.error('Discord OAuth error:', error.response?.data || error);
      
      // Redirect with error
      const redirectUrl = req.user 
        ? `${process.env.NEXT_PUBLIC_CLIENT_URL || 'http://localhost:3000'}/settings/integrations?error=discord_link_failed`
        : `${process.env.NEXT_PUBLIC_CLIENT_URL || 'http://localhost:3000'}/login?error=discord_auth_failed`;
        
      res.redirect(redirectUrl);
    }
  }
  
  private async addUserToServer(discordId: string, accessToken: string) {
    try {
      // Check if bot is in the guild and has proper permissions
      const botResponse = await axios.get(
        `https://discord.com/api/guilds/${config.DISCORD_GUILD_ID}`,
        {
          headers: {
            Authorization: `Bot ${config.DISCORD_BOT_TOKEN}`,
          },
        }
      );
      
      if (!botResponse.data) {
        console.warn('Bot is not in the specified guild');
        return;
      }
      
      // Add user to server using bot token
      await axios.put(
        `https://discord.com/api/guilds/${config.DISCORD_GUILD_ID}/members/${discordId}`,
        {
          access_token: accessToken,
        },
        {
          headers: {
            Authorization: `Bot ${config.DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      console.log(`Successfully added user ${discordId} to Discord server`);
    } catch (error: any) {
      // Don't throw - this is not critical
      if (error.response?.status === 204) {
        // User is already in the server
        console.log(`User ${discordId} is already in the Discord server`);
      } else {
        console.error('Failed to add user to Discord server:', error.response?.data || error.message);
      }
    }
  }
}