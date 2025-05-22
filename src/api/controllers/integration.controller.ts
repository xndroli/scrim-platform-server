// src/api/controllers/integration.controller.ts
import { Request, Response, NextFunction } from 'express';
import { db } from '../../db';
import { user, apexPlayerStats, teams, teamMembers, scrims } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { apexService } from '../../services/apex.service';
import { discordService } from '../../services/discord.service';
import { sendEmail, emailTemplates } from '../../utils/email';
import { unknown } from 'zod';

export class IntegrationController {
  // Discord Integration
  async linkDiscordAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const { discordId, discordUsername, discordAvatar } = req.body;
      const userId = req.user!.id;

      // Check if Discord account is already linked to another user
      const existingUser = await db.select()
        .from(user)
        .where(eq(user.discordId, discordId))
        .limit(1);

      if (existingUser.length > 0 && existingUser[0].id !== userId) {
        return res.status(400).json({
          status: 'error',
          message: 'This Discord account is already linked to another user',
        });
      }

      // Update user with Discord information
      const updatedUser = await db.update(user)
        .set({
          discordId,
          discordUsername,
          discordAvatar,
          discordLinkedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(user.id, userId))
        .returning();

      // Assign Discord roles if user is in guild
      try {
        await discordService.assignUserRoles(discordId, userId);
      } catch (discordError) {
        console.warn('Failed to assign Discord roles:', discordError);
        // Don't fail the linking process if Discord role assignment fails
      }

      res.status(200).json({
        status: 'success',
        message: 'Discord account linked successfully',
        data: { user: updatedUser[0] },
      });
    } catch (error) {
      next(error);
    }
  }

  async unlinkDiscordAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;

      const updatedUser = await db.update(user)
        .set({
          discordId: null,
          discordUsername: null,
          discordAvatar: null,
          discordLinkedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(user.id, userId))
        .returning();

      res.status(200).json({
        status: 'success',
        message: 'Discord account unlinked successfully',
        data: { user: updatedUser[0] },
      });
    } catch (error) {
      next(error);
    }
  }

  // Apex Legends Integration
  async linkApexAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const { apexPlayerName, apexPlatform } = req.body;
      const userId = req.user!.id;

      // Validate Apex player exists
      const apexPlayer = await apexService.searchPlayer(apexPlayerName, apexPlatform);
      
      if (!apexPlayer) {
        return res.status(404).json({
          status: 'error',
          message: 'Apex player not found. Please check the player name and platform.',
        });
      }

      // Check if Apex account is already linked to another user
      const existingUser = await db.select()
        .from(user)
        .where(eq(user.apexPlayerId, apexPlayer.playerId))
        .limit(1);

      if (existingUser.length > 0 && existingUser[0].id !== userId) {
        return res.status(400).json({
          status: 'error',
          message: 'This Apex account is already linked to another user',
        });
      }

      // Get detailed stats
      const playerStats = await apexService.getPlayerStats(apexPlayer.playerId, apexPlatform);

      // Update user with Apex information
      const updatedUser = await db.update(user)
        .set({
          apexPlayerId: apexPlayer.playerId,
          apexPlayerName: apexPlayer.playerName,
          apexPlatform,
          apexLevel: playerStats.globalStats.level,
          apexRankScore: playerStats.rankedStats.rankScore,
          apexRankTier: playerStats.rankedStats.rankName,
          apexLinkedAt: new Date(),
          apexLastSync: new Date(),
          apexVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(user.id, userId))
        .returning();

      // Store initial stats
      await this.saveApexStats(userId, playerStats);

      // Assign Discord role if Discord is linked
      if (updatedUser[0].discordId) {
        try {
          await discordService.assignApexRole(updatedUser[0].discordId);
        } catch (discordError) {
          console.warn('Failed to assign Apex Discord role:', discordError);
        }
      }

      res.status(200).json({
        status: 'success',
        message: 'Apex Legends account linked successfully',
        data: { 
          user: updatedUser[0],
          apexStats: playerStats 
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async unlinkApexAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;

      const updatedUser = await db.update(user)
        .set({
          apexPlayerId: null,
          apexPlayerName: null,
          apexPlatform: null,
          apexLevel: 0,
          apexRankScore: 0,
          apexRankTier: null,
          apexLinkedAt: null,
          apexLastSync: null,
          apexVerified: false,
          updatedAt: new Date(),
        })
        .where(eq(user.id, userId))
        .returning();

      res.status(200).json({
        status: 'success',
        message: 'Apex Legends account unlinked successfully',
        data: { user: updatedUser[0] },
      });
    } catch (error) {
      next(error);
    }
  }

  async syncApexStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;

      // Get user's Apex info
      const userData = await db.select()
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

      if (userData.length === 0 || !userData[0].apexPlayerId) {
        return res.status(400).json({
          status: 'error',
          message: 'No Apex account linked',
        });
      }

      const userInfo = userData[0];
      
      // Fetch latest stats from Apex API
      const playerStats = await apexService.getPlayerStats(
        userInfo.apexPlayerId!, 
        userInfo.apexPlatform!
      );

      // Update user stats
      await db.update(user)
        .set({
          apexLevel: playerStats.globalStats.level,
          apexRankScore: playerStats.rankedStats.rankScore,
          apexRankTier: playerStats.rankedStats.rankName,
          apexLastSync: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(user.id, userId));

      // Save stats history
      await this.saveApexStats(userId, playerStats);

      res.status(200).json({
        status: 'success',
        message: 'Apex stats synchronized successfully',
        data: { apexStats: playerStats },
      });
    } catch (error) {
      next(error);
    }
  }

  async getApexStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;

      // Get user's current stats from database
      const userData = await db.select()
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

      if (userData.length === 0 || !userData[0].apexPlayerId) {
        return res.status(400).json({
          status: 'error',
          message: 'No Apex account linked',
        });
      }

      // Get stats history
      const statsHistory = await db.select()
        .from(apexPlayerStats)
        .where(eq(apexPlayerStats.userId, userId))
        .orderBy(apexPlayerStats.recordedAt);

      res.status(200).json({
        status: 'success',
        data: {
          currentStats: {
            level: userData[0].apexLevel,
            rankScore: userData[0].apexRankScore,
            rankTier: userData[0].apexRankTier,
            lastSync: userData[0].apexLastSync,
          },
          statsHistory,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Team eligibility checking
  async checkTeamEligibility(req: Request, res: Response, next: NextFunction) {
    try {
      const { teamId } = req.params;
      const userId = req.user!.id;

      // Get team info
      const teamData = await db.select()
        .from(teams)
        .where(eq(teams.id, parseInt(teamId)))
        .limit(1);

      if (teamData.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Team not found',
        });
      }

      const team = teamData[0];

      // Get team members
      const members = await db.select({
        userId: teamMembers.userId,
        role: teamMembers.role,
      })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, team.id));

      const memberIds = members.map(m => m.userId);

      // Get members' user data
      const membersData = await db.select()
        .from(user)
        .where(eq(user.id, memberIds[0])); // This needs to be fixed with proper array handling

      // Check Discord requirements
      const discordEligible = team.requireDiscord ? 
        membersData.every(member => member.discordId) : true;

      // Check Apex requirements
      const apexEligible = team.requireApex ? 
        membersData.every(member => member.apexPlayerId && member.apexVerified) : true;

      // Check level requirements
      const levelEligible = team.minApexLevel ? 
        membersData.every(member => member.apexLevel >= team.minApexLevel!) : true;

      // Check rank requirements
      const rankEligible = team.allowedRankTiers ? 
        membersData.every(member => 
          team.allowedRankTiers!.includes(member.apexRankTier || 'Unranked')
        ) : true;

      const eligible = discordEligible && apexEligible && levelEligible && rankEligible;

      const issues = [];
      if (!discordEligible) issues.push('Some members have not linked Discord');
      if (!apexEligible) issues.push('Some members have not linked or verified Apex accounts');
      if (!levelEligible) issues.push(`Some members below minimum level ${team.minApexLevel}`);
      if (!rankEligible) issues.push('Some members do not meet rank requirements');

      res.status(200).json({
        status: 'success',
        data: {
          eligible,
          issues,
          requirements: {
            discord: team.requireDiscord,
            apex: team.requireApex,
            minLevel: team.minApexLevel,
            allowedRanks: team.allowedRankTiers,
          },
          members: membersData.map(member => ({
            id: member.id,
            name: member.name,
            discordLinked: !!member.discordId,
            apexLinked: !!member.apexPlayerId,
            apexLevel: member.apexLevel,
            apexRank: member.apexRankTier,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Scrim eligibility checking
  async checkScrimEligibility(req: Request, res: Response, next: NextFunction) {
    try {
      const { scrimId } = req.params;
      const { teamId } = req.body;

      // Get scrim info
      const scrimData = await db.select()
        .from(scrims)
        .where(eq(scrims.id, parseInt(scrimId)))
        .limit(1);

      if (scrimData.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Scrim not found',
        });
      }

      const scrim = scrimData[0];

      // Get team members
      const members = await db.select()
        .from(teamMembers)
        .innerJoin(user, eq(teamMembers.userId, user.id))
        .where(eq(teamMembers.teamId, teamId));

      // Check each requirement
      const checks = {
        discord: scrim.requireDiscord ? 
          members.every(m => m.user.discordId) : true,
        apex: scrim.requireApex ? 
          members.every(m => m.user.apexPlayerId && m.user.apexVerified) : true,
        minLevel: scrim.minLevel ? 
          members.every(m => m.user.apexLevel >= scrim.minLevel!) : true,
        maxLevel: scrim.maxLevel ? 
          members.every(m => m.user.apexLevel <= scrim.maxLevel!) : true,
        minRank: scrim.minRankScore ? 
          members.every(m => m.user.apexRankScore >= scrim.minRankScore!) : true,
        maxRank: scrim.maxRankScore ? 
          members.every(m => m.user.apexRankScore <= scrim.maxRankScore!) : true,
        allowedRanks: scrim.allowedRankTiers ? 
          members.every(m => scrim.allowedRankTiers!.includes(m.user.apexRankTier || 'Unranked')) : true,
      };

      const eligible = Object.values(checks).every(check => check);

      const issues = [];
      if (!checks.discord) issues.push('Some team members have not linked Discord');
      if (!checks.apex) issues.push('Some team members have not linked Apex accounts');
      if (!checks.minLevel) issues.push(`Some team members below minimum level ${scrim.minLevel}`);
      if (!checks.maxLevel) issues.push(`Some team members above maximum level ${scrim.maxLevel}`);
      if (!checks.minRank) issues.push('Some team members below minimum rank');
      if (!checks.maxRank) issues.push('Some team members above maximum rank');
      if (!checks.allowedRanks) issues.push('Some team members do not meet rank tier requirements');

      res.status(200).json({
        status: 'success',
        data: {
          eligible,
          issues,
          checks,
          requirements: {
            discord: scrim.requireDiscord,
            apex: scrim.requireApex,
            minLevel: scrim.minLevel,
            maxLevel: scrim.maxLevel,
            minRankScore: scrim.minRankScore,
            maxRankScore: scrim.maxRankScore,
            allowedRankTiers: scrim.allowedRankTiers,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Bulk sync all users' Apex stats
  async bulkSyncApexStats(req: Request, res: Response, next: NextFunction) {
    try {
      // Only allow admins to perform bulk sync
      if (req.user!.role !== 'admin') {
        return res.status(403).json({
          status: 'error',
          message: 'Admin access required',
        });
      }

      // Get all users with linked Apex accounts
      const usersWithApex = await db.select()
        .from(user)
        .where(eq(user.apexPlayerId, user.apexPlayerId)); // This gets users where apexPlayerId is not null

      const syncResults = [];
      const errors = [];

      for (const userData of usersWithApex) {
        try {
          if (userData.apexPlayerId && userData.apexPlatform) {
            const playerStats = await apexService.getPlayerStats(
              userData.apexPlayerId,
              userData.apexPlatform
            );

            // Update user stats
            await db.update(user)
              .set({
                apexLevel: playerStats.globalStats.level,
                apexRankScore: playerStats.rankedStats.rankScore,
                apexRankTier: playerStats.rankedStats.rankName,
                apexLastSync: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(user.id, userData.id));

            // Save stats history
            await this.saveApexStats(userData.id, playerStats);

            syncResults.push({
              userId: userData.id,
              playerName: userData.apexPlayerName,
              success: true,
            });
          }
        } catch (error: Error | any) {
          errors.push({
            userId: userData.id,
            playerName: userData.apexPlayerName,
            error: error.message,
          });
        }

        // Add delay to avoid API rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      res.status(200).json({
        status: 'success',
        message: `Bulk sync completed. ${syncResults.length} successful, ${errors.length} errors`,
        data: {
          successful: syncResults,
          errors,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Helper method to save Apex stats
  private async saveApexStats(userId: string, playerStats: any) {
    try {
      // Get current season (this should be configurable)
      const currentSeason = 20; // Update this based on current Apex season

      await db.insert(apexPlayerStats)
        .values({
          userId,
          season: currentSeason,
          level: playerStats.globalStats.level,
          kills: playerStats.globalStats.kills,
          damage: playerStats.globalStats.damage,
          matches: playerStats.globalStats.matches,
          wins: playerStats.globalStats.wins,
          top5s: playerStats.globalStats.top5s,
          kd: Math.round(playerStats.globalStats.kd * 100), // Store as integer
          rankScore: playerStats.rankedStats.rankScore,
          rankTier: playerStats.rankedStats.rankName,
          rankDiv: playerStats.rankedStats.rankDiv,
          rankedKills: playerStats.rankedStats.kills,
          rankedDamage: playerStats.rankedStats.damage,
          rankedMatches: playerStats.rankedStats.matches,
          rankedWins: playerStats.rankedStats.wins,
          legendStats: JSON.stringify(playerStats.legendStats),
        })
        .onConflictDoUpdate({
          target: [apexPlayerStats.userId, apexPlayerStats.season],
          set: {
            level: playerStats.globalStats.level,
            kills: playerStats.globalStats.kills,
            damage: playerStats.globalStats.damage,
            matches: playerStats.globalStats.matches,
            wins: playerStats.globalStats.wins,
            top5s: playerStats.globalStats.top5s,
            kd: Math.round(playerStats.globalStats.kd * 100),
            rankScore: playerStats.rankedStats.rankScore,
            rankTier: playerStats.rankedStats.rankName,
            rankDiv: playerStats.rankedStats.rankDiv,
            rankedKills: playerStats.rankedStats.kills,
            rankedDamage: playerStats.rankedStats.damage,
            rankedMatches: playerStats.rankedStats.matches,
            rankedWins: playerStats.rankedStats.wins,
            legendStats: JSON.stringify(playerStats.legendStats),
            recordedAt: new Date(),
          },
        });
    } catch (error) {
      console.error('Failed to save Apex stats:', error);
    }
  }

  // Get integration status for user
  async getIntegrationStatus(req: Request, res: Response, next: NextFunction) {
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

      const integrationStatus = {
        discord: {
          linked: !!userInfo.discordId,
          username: userInfo.discordUsername,
          linkedAt: userInfo.discordLinkedAt,
        },
        apex: {
          linked: !!userInfo.apexPlayerId,
          playerName: userInfo.apexPlayerName,
          platform: userInfo.apexPlatform,
          level: userInfo.apexLevel,
          rankTier: userInfo.apexRankTier,
          rankScore: userInfo.apexRankScore,
          verified: userInfo.apexVerified,
          linkedAt: userInfo.apexLinkedAt,
          lastSync: userInfo.apexLastSync,
        },
      };

      res.status(200).json({
        status: 'success',
        data: integrationStatus,
      });
    } catch (error) {
      next(error);
    }
  }
}