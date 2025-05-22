// src/api/middleware/discord.middleware.ts - Middleware for Discord requirements
import { Request, Response, NextFunction } from 'express';
import { db } from '../../db';
import { user } from '../../db/schema';
import { eq } from 'drizzle-orm';

export const requireDiscordLink = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const userData = await db.select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (userData.length === 0 || !userData[0].discordId) {
      return res.status(403).json({
        status: 'error',
        message: 'Discord account must be linked to access this feature',
        requirement: 'discord_link',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const requireApexLink = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const userData = await db.select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (userData.length === 0 || !userData[0].apexPlayerId || !userData[0].apexVerified) {
      return res.status(403).json({
        status: 'error',
        message: 'Verified Apex Legends account must be linked to access this feature',
        requirement: 'apex_link',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const requireBothIntegrations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const userData = await db.select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (userData.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    const userInfo = userData[0];
    const issues = [];

    if (!userInfo.discordId) {
      issues.push('Discord account not linked');
    }

    if (!userInfo.apexPlayerId || !userInfo.apexVerified) {
      issues.push('Apex Legends account not linked or verified');
    }

    if (issues.length > 0) {
      return res.status(403).json({
        status: 'error',
        message: 'Required integrations missing',
        issues,
        requirements: ['discord_link', 'apex_link'],
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};