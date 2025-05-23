import { config } from '../../config/environment';
import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

export class DiscordController {
    async handleCallback(req: Request, res: Response, next: NextFunction) {
        try {
            const { code, state } = req.query;
        
            if (!code) {
                return res.status(400).json({
                status: 'error',
                message: 'Missing authorization code',
                });
            }
        
            // Exchange code for access token
            const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', 
                new URLSearchParams({
                client_id: config.DISCORD_CLIENT_ID,
                client_secret: config.DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code as string,
                redirect_uri: config.DISCORD_REDIRECT_URI || `${req.protocol}://${req.get('host')}/auth/discord/callback`,
                }),
                {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                }
            );
        
            const { access_token } = tokenResponse.data;
        
            // Get user info from Discord
            const userResponse = await axios.get('https://discord.com/api/users/@me', {
                headers: {
                Authorization: `Bearer ${access_token}`,
                },
            });
        
            const discordUser = userResponse.data;
        
            // Check if user is in the required guild
            const guildsResponse = await axios.get('https://discord.com/api/users/@me/guilds', {
                headers: {
                Authorization: `Bearer ${access_token}`,
                },
            });
        
            const isInGuild = guildsResponse.data.some((guild: any) => guild.id === config.DISCORD_GUILD_ID);
        
            if (!isInGuild) {
                return res.status(400).json({
                status: 'error',
                message: 'You must be a member of the required Discord server',
                });
            }
        
            // Return Discord user info for client-side handling
            res.json({
                status: 'success',
                data: {
                discordId: discordUser.id,
                discordUsername: `${discordUser.username}#${discordUser.discriminator}`,
                discordAvatar: discordUser.avatar 
                    ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
                    : null,
                },
            });
            } catch (error) {
                console.error('Discord OAuth error:', error);
                res.status(500).json({
                    status: 'error',
                    message: 'Discord authentication failed',
            });
        }
    }
};