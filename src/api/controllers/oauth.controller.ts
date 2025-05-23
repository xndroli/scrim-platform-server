// src/api/controllers/oauth.controller.ts
import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { db } from '../../db';
import { userDiscordAccounts } from '../../db/schema';
import { config } from '../../config/environment';

export class OAuthController {
  async discordAuth(req: Request, res: Response, next: NextFunction) {
    const state = crypto.randomUUID();
    
    // Store state in session or Redis for verification
    req.session!.discordState = state;
    
    const params = new URLSearchParams({
      client_id: config.DISCORD_CLIENT_ID,
      redirect_uri: `${process.env.NEXT_PUBLIC_API_URL}/api/oauth/discord/callback`,
      response_type: 'code',
      scope: 'identify guilds',
      state,
    });
    
    res.redirect(`https://discord.com/oauth2/authorize?${params}`);
  }
  
  async discordCallback(req: Request, res: Response, next: NextFunction) {
    const { code, state } = req.query;
    
    // Verify state
    if (state !== req.session!.discordState) {
      return res.status(400).json({ error: 'Invalid state' });
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
          redirect_uri: `${process.env.NEXT_PUBLIC_API_URL}/api/oauth/discord/callback`,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      
      const { access_token, refresh_token, expires_in } = tokenResponse.data;
      
      // Get user info
      const userResponse = await axios.get('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });
      
      const discordUser = userResponse.data;
      
      // Store in database
      await db.insert(userDiscordAccounts)
        .values({
          userId: req.user!.id,
          discordId: discordUser.id,
          username: discordUser.username,
          discriminator: discordUser.discriminator,
          avatar: discordUser.avatar,
          accessToken: access_token,
          refreshToken: refresh_token,
          tokenExpiresAt: new Date(Date.now() + expires_in * 1000),
        })
        .onConflictDoUpdate({
          target: userDiscordAccounts.discordId,
          set: {
            username: discordUser.username,
            discriminator: discordUser.discriminator,
            avatar: discordUser.avatar,
            accessToken: access_token,
            refreshToken: refresh_token,
            tokenExpiresAt: new Date(Date.now() + expires_in * 1000),
          },
        });
      
      // Add user to Discord server if bot is in server
      await this.addUserToServer(discordUser.id, access_token);
      
      res.redirect(`${process.env.NEXT_PUBLIC_CLIENT_URL}/settings?discord=linked`);
    } catch (error) {
      next(error);
    }
  }
  
  private async addUserToServer(discordId: string, accessToken: string) {
    try {
      // Get user's guilds
      const guildsResponse = await axios.get('https://discord.com/api/users/@me/guilds', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      // Add user to server using bot token
      // This requires the bot to be in the server with proper permissions
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
    } catch (error) {
      console.error('Failed to add user to server:', error);
    }
  }
}