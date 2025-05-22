// src/api/controllers/scrim.controller.ts - Enhanced with Discord & Apex integration
import { Request, Response, NextFunction } from 'express';
import { db } from '../../db';
import { scrims, scrimParticipants, teams, teamMembers, matches, matchResults, playerMatchStats, users, discordScrimChannels } from '../../db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { sendEmail, emailTemplates } from '../../utils/email';
import { discordService } from '../../services/discord.service';
import { apexService } from '../../services/apex.service';

export class ScrimController {
  // Create a new scrim with Discord integration
  async createScrim(req: Request, res: Response, next: NextFunction) {
    try {
      const { 
        title, 
        game, 
        scheduledAt, 
        maxTeams,
        minLevel,
        maxLevel,
        minRankScore,
        maxRankScore,
        allowedRankTiers,
        requireDiscord = true,
        requireApex = true
      } = req.body;
      const userId = req.user!.id;

      // Create scrim
      const newScrim = await db.insert(scrims)
        .values({
          title,
          game,
          scheduledAt: new Date(scheduledAt),
          creatorId: userId,
          maxTeams: maxTeams || 20,
          minLevel,
          maxLevel,
          minRankScore,
          maxRankScore,
          allowedRankTiers,
          requireDiscord,
          requireApex,
          updatedAt: new Date(),
        })
        .returning();

      const scrim = newScrim[0];

      // Create Discord channels for the scrim
      try {
        const discordChannels = await discordService.createScrimChannels(
          scrim.id,
          scrim.title,
          scrim.maxTeams
        );

        // Store Discord channel information
        await db.insert(discordScrimChannels)
          .values({
            scrimId: scrim.id,
            guildId: process.env.DISCORD_GUILD_ID!,
            textChannelId: discordChannels.textChannelId,
            voiceChannelIds: discordChannels.voiceChannelIds,
          });

        // Send initial Discord notification
        await discordService.sendMatchNotification(
          scrim.id,
          `🎮 New scrim created: **${scrim.title}**\n📅 Scheduled: ${new Date(scrim.scheduledAt).toLocaleString()}\n🎯 Game: ${scrim.game}\n👥 Max Teams: ${scrim.maxTeams}`
        );

      } catch (discordError) {
        console.warn('Failed to create Discord channels:', discordError);
        // Don't fail scrim creation if Discord fails
      }

      res.status(201).json({
        status: 'success',
        message: 'Scrim created successfully',
        data: { scrim },
      });
    } catch (error) {
      next(error);
    }
  }

  // Enhanced join scrim with eligibility checking
  async joinScrim(req: Request, res: Response, next: NextFunction) {
    try {
      const { scrimId } = req.params;
      const { teamId } = req.body;
      const userId = req.user!.id;

      // Get scrim
      const scrimResult = await db.select().from(scrims)
        .where(eq(scrims.id, parseInt(scrimId)))
        .limit(1);

      if (scrimResult.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Scrim not found',
        });
      }

      const scrim = scrimResult[0];

      // Check if scrim is full
      const participants = await db.select()
        .from(scrimParticipants)
        .where(eq(scrimParticipants.scrimId, scrim.id));

      if (participants.length >= scrim.maxTeams) {
        return res.status(400).json({
          status: 'error',
          message: 'Scrim is full',
        });
      }

      // Get team and check membership
      const teamResult = await db.select().from(teams)
        .where(eq(teams.id, parseInt(teamId)))
        .limit(1);

      if (teamResult.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Team not found',
        });
      }

      const team = teamResult[0];

      // Check if user is a member of the team
      const membershipResult = await db.select().from(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, team.id),
            eq(teamMembers.userId, userId)
          )
        )
        .limit(1);

      if (membershipResult.length === 0) {
        return res.status(403).json({
          status: 'error',
          message: 'You are not a member of this team',
        });
      }

      // Check if team is already in the scrim
      const existingParticipant = await db.select().from(scrimParticipants)
        .where(
          and(
            eq(scrimParticipants.scrimId, scrim.id),
            eq(scrimParticipants.teamId, team.id)
          )
        )
        .limit(1);

      if (existingParticipant.length > 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Team is already participating in this scrim',
        });
      }

      // Enhanced eligibility checking
      const eligibilityCheck = await this.checkTeamEligibilityForScrim(team.id, scrim);
      
      if (!eligibilityCheck.eligible) {
        return res.status(403).json({
          status: 'error',
          message: 'Team does not meet scrim requirements',
          details: eligibilityCheck.issues,
        });
      }

      // Add team to scrim
      const participant = await db.insert(scrimParticipants)
        .values({
          scrimId: scrim.id,
          teamId: team.id,
          status: 'confirmed',
          discordVerified: eligibilityCheck.checks.discord,
          apexVerified: eligibilityCheck.checks.apex,
          eligibilityChecked: true,
        })
        .returning();

      // Discord integration - assign roles and move to voice
      try {
        const teamMembers = await db.select()
          .from(teamMembers)
          .innerJoin(users, eq(teamMembers.userId, users.id))
          .where(eq(teamMembers.teamId, team.id));

        const teamNumber = participants.length + 1;

        for (const member of teamMembers) {
          if (member.users.discordId) {
            // Assign team roles
            await discordService.assignTeamRoles(
              member.users.discordId,
              team.id,
              member.team_members.role === 'owner' ? 'captain' : 'player'
            );

            // Move to team voice channel if they're in voice
            await discordService.moveToTeamVoice(
              member.users.discordId,
              teamNumber,
              scrim.id
            );
          }
        }

        // Send Discord notification
        await discordService.sendMatchNotification(
          scrim.id,
          `✅ **${team.name}** has joined the scrim!\n👥 Teams registered: ${participants.length + 1}/${scrim.maxTeams}`
        );

      } catch (discordError) {
        console.warn('Discord integration failed:', discordError);
      }

      // Send notification emails to team members
      try {
        const teamMembersData = await db.select({
          userId: teamMembers.userId,
        })
        .from(teamMembers)
        .where(eq(teamMembers.teamId, team.id));

        const userIds = teamMembersData.map(m => m.userId);
        if (userIds.length > 0) {
          const usersData = await db.select({
            id: users.id,
            email: users.email,
            username: users.username,
          })
          .from(users)
          .where(inArray(users.id, userIds));

          for (const user of usersData) {
            if (user.id !== userId) {
              try {
                await sendEmail({
                  to: user.email,
                  ...emailTemplates.scrimInvitation(
                    team.name,
                    { 
                      id: scrim.id,
                      title: scrim.title, 
                      date: new Date(scrim.scheduledAt).toLocaleString(), 
                      game: scrim.game 
                    },
                    parseInt(user.id)
                  )
                });
              } catch (emailError) {
                console.error(`Failed to send notification email to ${user.email}:`, emailError);
              }
            }
          }
        }
      } catch (emailError) {
        console.warn('Failed to send notification emails:', emailError);
      }

      res.status(201).json({
        status: 'success',
        message: 'Joined scrim successfully',
        data: { 
          participant: participant[0],
          teamName: team.name,
          eligibilityStatus: eligibilityCheck,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Enhanced match creation with Discord notifications
  async createMatch(req: Request, res: Response, next: NextFunction) {
    try {
      const { scrimId } = req.params;
      const { mapName } = req.body;
      const userId = req.user!.id;

      // Get scrim
      const scrimResult = await db.select().from(scrims)
        .where(eq(scrims.id, parseInt(scrimId)))
        .limit(1);

      if (scrimResult.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Scrim not found',
        });
      }

      const scrim = scrimResult[0];

      // Check permissions (only creator can create matches)
      if (scrim.creatorId !== userId) {
        return res.status(403).json({
          status: 'error',
          message: 'Only the creator can create matches for this scrim',
        });
      }

      // Create match
      const match = await db.insert(matches)
        .values({
          scrimId: scrim.id,
          mapName,
          startTime: new Date(),
        })
        .returning();

      // Update scrim status
      await db.update(scrims)
        .set({
          status: 'in-progress',
          updatedAt: new Date(),
        })
        .where(eq(scrims.id, scrim.id));

      // Discord notifications
      try {
        await discordService.sendMatchNotification(
          scrim.id,
          `🚀 **Match Started!**\n🗺️ Map: ${mapName || 'Unknown'}\n⏰ Started: ${new Date().toLocaleString()}\n\nGood luck to all teams! 🏆`,
          ['@everyone'] // Mention everyone in the scrim
        );

        await discordService.updateScrimStatus(
          scrim.id,
          'In Progress',
          `Match is now live on ${mapName || 'the selected map'}`
        );
      } catch (discordError) {
        console.warn('Discord notification failed:', discordError);
      }

      res.status(201).json({
        status: 'success',
        message: 'Match created successfully',
        data: { match: match[0] },
      });
    } catch (error) {
      next(error);
    }
  }

  // Enhanced result recording with Apex stats validation
  async recordMatchResults(req: Request, res: Response, next: NextFunction) {
    try {
      const { matchId } = req.params;
      const { results, playerStats } = req.body;
      const userId = req.user!.id;

      // Get match and scrim
      const matchResult = await db.select().from(matches)
        .innerJoin(scrims, eq(matches.scrimId, scrims.id))
        .where(eq(matches.id, parseInt(matchId)))
        .limit(1);

      if (matchResult.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Match not found',
        });
      }

      const match = matchResult[0].matches;
      const scrim = matchResult[0].scrims;

      // Check permissions (only creator can record results)
      if (scrim.creatorId !== userId) {
        return res.status(403).json({
          status: 'error',
          message: 'Only the creator can record results for this match',
        });
      }

      // Validate results data
      if (!results || !Array.isArray(results) || results.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid results data',
        });
      }

      // Clear existing results
      await db.delete(matchResults)
        .where(eq(matchResults.matchId, match.id));

      await db.delete(playerMatchStats)
        .where(eq(playerMatchStats.matchId, match.id));

      // Record match results
      const matchResultsData = results.map((result: any) => ({
        matchId: match.id,
        teamId: result.teamId,
        placement: result.placement,
        score: result.score || 0,
        totalKills: result.totalKills || 0,
        totalDamage: result.totalDamage || 0,
        survivalTime: result.survivalTime || 0,
      }));

      await db.insert(matchResults).values(matchResultsData);

      // Record player stats if provided
      if (playerStats && Array.isArray(playerStats) && playerStats.length > 0) {
        const playerStatsData = playerStats.map((stat: any) => ({
          matchId: match.id,
          userId: stat.userId,
          kills: stat.kills || 0,
          deaths: stat.deaths || 0,
          assists: stat.assists || 0,
          damageDealt: stat.damageDealt || 0,
          legend: stat.legend,
          revives: stat.revives || 0,
          respawns: stat.respawns || 0,
          survivalTime: stat.survivalTime || 0,
        }));

        await db.insert(playerMatchStats).values(playerStatsData);
      }

      // Update match completion
      await db.update(matches)
        .set({
          endTime: new Date(),
        })
        .where(eq(matches.id, match.id));

      // Update scrim status to completed if this was the final match
      await db.update(scrims)
        .set({
          status: 'completed',
          updatedAt: new Date(),
        })
        .where(eq(scrims.id, scrim.id));

      // Discord notifications with results
      try {
        const topTeams = results
          .sort((a: any, b: any) => a.placement - b.placement)
          .slice(0, 3);

        let resultsMessage = '🏁 **Match Results**\n\n';
        resultsMessage += '🏆 **Top 3 Teams:**\n';
        
        for (let i = 0; i < Math.min(3, topTeams.length); i++) {
          const team = topTeams[i];
          const medals = ['🥇', '🥈', '🥉'];
          resultsMessage += `${medals[i]} **Place ${team.placement}**: Team ${team.teamId} (${team.totalKills || 0} kills)\n`;
        }

        await discordService.sendMatchNotification(
          scrim.id,
          resultsMessage
        );

        await discordService.updateScrimStatus(
          scrim.id,
          'Completed',
          'Match results have been recorded. GG to all participants!'
        );

        // Clean up Discord channels after a delay
        setTimeout(async () => {
          try {
            await discordService.cleanupScrimChannels(scrim.id);
          } catch (cleanupError) {
            console.warn('Discord cleanup failed:', cleanupError);
          }
        }, 30000); // 30 second delay

      } catch (discordError) {
        console.warn('Discord result notification failed:', discordError);
      }

      res.status(200).json({
        status: 'success',
        message: 'Match results recorded successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // Helper method to check team eligibility for a specific scrim
  private async checkTeamEligibilityForScrim(teamId: number, scrim: any): Promise<{
    eligible: boolean;
    issues: string[];
    checks: {
      discord: boolean;
      apex: boolean;
      level: boolean;
      rank: boolean;
    };
  }> {
    try {
      // Get team members with user data
      const members = await db.select()
        .from(teamMembers)
        .innerJoin(users, eq(teamMembers.userId, users.id))
        .where(eq(teamMembers.teamId, teamId));

      const checks = {
        discord: true,
        apex: true,
        level: true,
        rank: true,
      };

      const issues: string[] = [];

      // Check Discord requirements
      if (scrim.requireDiscord) {
        const discordLinked = members.every(member => member.users.discordId);
        if (!discordLinked) {
          checks.discord = false;
          issues.push('Not all team members have linked Discord accounts');
        }
      }

      // Check Apex requirements
      if (scrim.requireApex) {
        const apexLinked = members.every(member => 
          member.users.apexPlayerId && member.users.apexVerified
        );
        if (!apexLinked) {
          checks.apex = false;
          issues.push('Not all team members have verified Apex accounts');
        }
      }

      // Check level requirements
      if (scrim.minLevel || scrim.maxLevel) {
        for (const member of members) {
          const level = member.users.apexLevel || 0;
          if (scrim.minLevel && level < scrim.minLevel) {
            checks.level = false;
            issues.push(`${member.users.name} is below minimum level (${level} < ${scrim.minLevel})`);
          }
          if (scrim.maxLevel && level > scrim.maxLevel) {
            checks.level = false;
            issues.push(`${member.users.name} is above maximum level (${level} > ${scrim.maxLevel})`);
          }
        }
      }

      // Check rank requirements
      if (scrim.minRankScore || scrim.maxRankScore || scrim.allowedRankTiers) {
        for (const member of members) {
          const rankScore = member.users.apexRankScore || 0;
          const rankTier = member.users.apexRankTier || 'Unranked';

          if (scrim.minRankScore && rankScore < scrim.minRankScore) {
            checks.rank = false;
            issues.push(`${member.users.name} is below minimum rank score`);
          }
          if (scrim.maxRankScore && rankScore > scrim.maxRankScore) {
            checks.rank = false;
            issues.push(`${member.users.name} is above maximum rank score`);
          }
          if (scrim.allowedRankTiers && !scrim.allowedRankTiers.includes(rankTier)) {
            checks.rank = false;
            issues.push(`${member.users.name} rank tier not allowed for this scrim`);
          }
        }
      }

      const eligible = Object.values(checks).every(check => check);

      return {
        eligible,
        issues,
        checks,
      };
    } catch (error) {
      console.error('Eligibility check failed:', error);
      return {
        eligible: false,
        issues: ['Failed to verify team eligibility'],
        checks: {
          discord: false,
          apex: false,
          level: false,
          rank: false,
        },
      };
    }
  }
  
  // Get all scrims (with optional filters)
  async getScrims(req: Request, res: Response, next: NextFunction) {
  try {
    const gameFilter = req.query.game as string | undefined;
    const statusFilter = req.query.status as string | undefined;
    
    // Build query conditionally without using a variable query
    let scrimResults;
    
    // Apply different combinations of filters
    if (gameFilter && statusFilter) {
      // Both filters
      scrimResults = await db.select()
        .from(scrims)
        .where(
          and(
            eq(scrims.game, gameFilter),
            eq(scrims.status, statusFilter)
          )
        )
        .orderBy(desc(scrims.scheduledAt));
    } else if (gameFilter) {
      // Only game filter
      scrimResults = await db.select()
        .from(scrims)
        .where(eq(scrims.game, gameFilter))
        .orderBy(desc(scrims.scheduledAt));
    } else if (statusFilter) {
      // Only status filter
      scrimResults = await db.select()
        .from(scrims)
        .where(eq(scrims.status, statusFilter))
        .orderBy(desc(scrims.scheduledAt));
    } else {
      // No filters
      scrimResults = await db.select()
        .from(scrims)
        .orderBy(desc(scrims.scheduledAt));
    }
    
    res.status(200).json({
      status: 'success',
      data: { scrims: scrimResults },
    });
  } catch (error) {
    next(error);
  }
}
  
  // Get a single scrim by ID
  async getScrim(req: Request, res: Response, next: NextFunction) {
    try {
      const { scrimId } = req.params;
      
      // Get scrim
      const scrimResult = await db.select().from(scrims)
        .where(eq(scrims.id, parseInt(scrimId)))
        .limit(1);
      
      if (scrimResult.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Scrim not found',
        });
      }
      
      const scrim = scrimResult[0];
      
      // Get participants
      const participants = await db.select({
        id: scrimParticipants.id,
        teamId: scrimParticipants.teamId,
        status: scrimParticipants.status,
        joinedAt: scrimParticipants.joinedAt,
      })
      .from(scrimParticipants)
      .where(eq(scrimParticipants.scrimId, scrim.id));
      
      // Get team names
      const teamIds = participants.map(p => p.teamId);
      let teamsData: any[] = [];
      
      if (teamIds.length > 0) {
        teamsData = await db.select({
          id: teams.id,
          name: teams.name,
          logo: teams.logo,
        })
        .from(teams)
        .where(inArray(teams.id, teamIds));
      }
      
      // Combine data
      const participantsWithTeamInfo = participants.map(participant => {
        const team = teamsData.find(t => t.id === participant.teamId);
        return {
          ...participant,
          teamName: team?.name,
          teamLogo: team?.logo,
        };
      });
      
      // Get matches
      const matchesData = await db.select()
        .from(matches)
        .where(eq(matches.scrimId, scrim.id))
        .orderBy(desc(matches.createdAt));
      
      const scrimWithDetails = {
        ...scrim,
        participants: participantsWithTeamInfo,
        matches: matchesData,
      };
      
      res.status(200).json({
        status: 'success',
        data: { scrim: scrimWithDetails },
      });
    } catch (error) {
      next(error);
    }
  }
  
  // Update a scrim
  async updateScrim(req: Request, res: Response, next: NextFunction) {
    try {
      const { scrimId } = req.params;
      const { title, game, scheduledAt, status, maxTeams } = req.body;
      const userId = req.user!.id;
      
      // Get scrim
      const scrimResult = await db.select().from(scrims)
        .where(eq(scrims.id, parseInt(scrimId)))
        .limit(1);
      
      if (scrimResult.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Scrim not found',
        });
      }
      
      const scrim = scrimResult[0];
      
      // Check permissions (only creator can update)
      if (scrim.creatorId !== userId) {
        return res.status(403).json({
          status: 'error',
          message: 'Only the creator can update this scrim',
        });
      }
      
      // Update scrim
      const updateData: any = { updatedAt: new Date() };
      if (title !== undefined) updateData.title = title;
      if (game !== undefined) updateData.game = game;
      if (scheduledAt !== undefined) updateData.scheduledAt = new Date(scheduledAt);
      if (status !== undefined) updateData.status = status;
      if (maxTeams !== undefined) updateData.maxTeams = maxTeams;
      
      const updatedScrim = await db.update(scrims)
        .set(updateData)
        .where(eq(scrims.id, scrim.id))
        .returning();
      
      res.status(200).json({
        status: 'success',
        message: 'Scrim updated successfully',
        data: { scrim: updatedScrim[0] },
      });
    } catch (error) {
      next(error);
    }
  }
  
  // Join a scrim with a team
  async joinScrim(req: Request, res: Response, next: NextFunction) {
    try {
      const { scrimId } = req.params;
      const { teamId } = req.body;
      const userId = req.user!.id;

      // Check eligibility requirements
      const eligibility = await db.select()
        .from(scrimEligibility)
        .where(eq(scrimEligibility.scrimId, parseInt(scrimId)))
        .limit(1);
      
      if (eligibility[0]) {
        // Check Discord requirement
        if (eligibility[0].requireDiscord) {
          const discordAccount = await db.select()
            .from(userDiscordAccounts)
            .where(eq(userDiscordAccounts.userId, userId))
            .limit(1);
          
          if (!discordAccount[0]) {
            return res.status(400).json({
              status: 'error',
              message: 'Discord account must be linked to join this scrim',
            });
          }
        }
        
        // Check Apex requirement
        if (eligibility[0].requireApexLink) {
          const apexAccount = await db.select()
            .from(apexAccounts)
            .where(eq(apexAccounts.userId, userId))
            .limit(1);
          
          if (!apexAccount[0] || !apexAccount[0].isVerified) {
            return res.status(400).json({
              status: 'error',
              message: 'Verified Apex Legends account required to join this scrim',
            });
          }
          
          // Check rank requirements
          const apexStat = await db.select()
            .from(apexStats)
            .where(eq(apexStats.userId, userId))
            .limit(1);
          
          if (apexStat[0]) {

          }
        }
      }
      
      // Get scrim
      const scrimResult = await db.select().from(scrims)
        .where(eq(scrims.id, parseInt(scrimId)))
        .limit(1);
      
      if (scrimResult.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Scrim not found',
        });
      }
      
      const scrim = scrimResult[0];
      
      // Check if scrim is full - using a simpler count approach
      const participants = await db.select()
        .from(scrimParticipants)
        .where(eq(scrimParticipants.scrimId, scrim.id));
      
      if (participants.length >= scrim.maxTeams) {
        return res.status(400).json({
          status: 'error',
          message: 'Scrim is full',
        });
      }
      
      // Check if team exists
      const teamResult = await db.select().from(teams)
        .where(eq(teams.id, parseInt(teamId)))
        .limit(1);
      
      if (teamResult.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Team not found',
        });
      }
      
      const team = teamResult[0];
      
      // Check if user is a member of the team
      const membershipResult = await db.select().from(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, team.id),
            eq(teamMembers.userId, userId)
          )
        )
        .limit(1);
      
      if (membershipResult.length === 0) {
        return res.status(403).json({
          status: 'error',
          message: 'You are not a member of this team',
        });
      }
      
      // Check if team is already in the scrim
      const existingParticipant = await db.select().from(scrimParticipants)
        .where(
          and(
            eq(scrimParticipants.scrimId, scrim.id),
            eq(scrimParticipants.teamId, team.id)
          )
        )
        .limit(1);
      
      if (existingParticipant.length > 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Team is already participating in this scrim',
        });
      }
      
      // Add team to scrim
      const participant = await db.insert(scrimParticipants)
        .values({
          scrimId: scrim.id,
          teamId: team.id,
          status: 'confirmed',
        })
        .returning();
      
      // Get team members to notify them
      const teamMembersData = await db.select({
        userId: teamMembers.userId,
      })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, team.id));
      
      // Get user emails
      const userIds = teamMembersData.map(m => m.userId);
      if (userIds.length > 0) {
        const usersData = await db.select({
          id: users.id,
          email: users.email,
          username: users.username,
        })
        .from(users)
        .where(inArray(users.id, userIds));
        
        // Send notification emails to team members (except the one who joined)
        for (const user of usersData) {
          if (user.id !== userId) {
            try {
              await sendEmail({
                to: user.email,
                ...emailTemplates.scrimInvitation(
                  team.name,
                  { 
                    id: scrim.id,
                    title: scrim.title, 
                    date: new Date(scrim.scheduledAt).toLocaleString(), 
                    game: scrim.game 
                  },
                  user.id
                )
              });
            } catch (emailError) {
              console.error(`Failed to send notification email to ${user.email}:`, emailError);
            }
          }
        }
      }
      
      res.status(201).json({
        status: 'success',
        message: 'Joined scrim successfully',
        data: { 
          participant: participant[0],
          teamName: team.name,
        },
      });

      // After successful join, assign Discord role and channels
      if (eligibility[0]?.requireDiscord) {
        await discordBot.assignTeamToVoiceChannel(userId, parseInt(teamId), parseInt(scrimId));
      }
    } catch (error) {
      next(error);
    }
  }
  
  // Leave a scrim
  async leaveScrim(req: Request, res: Response, next: NextFunction) {
    try {
      const { scrimId, teamId } = req.params;
      const userId = req.user!.id;
      
      // Get scrim
      const scrimResult = await db.select().from(scrims)
        .where(eq(scrims.id, parseInt(scrimId)))
        .limit(1);
      
      if (scrimResult.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Scrim not found',
        });
      }
      
      // Check if team is in the scrim
      const participantResult = await db.select().from(scrimParticipants)
        .where(
          and(
            eq(scrimParticipants.scrimId, parseInt(scrimId)),
            eq(scrimParticipants.teamId, parseInt(teamId))
          )
        )
        .limit(1);
      
      if (participantResult.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Team is not participating in this scrim',
        });
      }
      
      // Check if user is a member of the team
      const membershipResult = await db.select().from(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, parseInt(teamId)),
            eq(teamMembers.userId, userId)
          )
        )
        .limit(1);
      
      if (membershipResult.length === 0) {
        return res.status(403).json({
          status: 'error',
          message: 'You are not a member of this team',
        });
      }
      
      // Check if user has permission to remove the team
      // Owner or manager can remove the team
      if (!['owner', 'manager'].includes(membershipResult[0].role)) {
        return res.status(403).json({
          status: 'error',
          message: 'Only team owner or manager can remove the team from a scrim',
        });
      }
      
      // Remove team from scrim
      await db.delete(scrimParticipants)
        .where(
          and(
            eq(scrimParticipants.scrimId, parseInt(scrimId)),
            eq(scrimParticipants.teamId, parseInt(teamId))
          )
        );
      
      res.status(200).json({
        status: 'success',
        message: 'Left scrim successfully',
      });
    } catch (error) {
      next(error);
    }
  }
  
  // Create a match for a scrim
  async createMatch(req: Request, res: Response, next: NextFunction) {
    try {
      const { scrimId } = req.params;
      const { mapName } = req.body;
      const userId = req.user!.id;
      
      // Get scrim
      const scrimResult = await db.select().from(scrims)
        .where(eq(scrims.id, parseInt(scrimId)))
        .limit(1);
      
      if (scrimResult.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Scrim not found',
        });
      }
      
      const scrim = scrimResult[0];
      
      // Check permissions (only creator can create matches)
      if (scrim.creatorId !== userId) {
        return res.status(403).json({
          status: 'error',
          message: 'Only the creator can create matches for this scrim',
        });
      }
      
      // Create match
      const match = await db.insert(matches)
        .values({
          scrimId: scrim.id,
          mapName,
          startTime: new Date(),
        })
        .returning();
      
      res.status(201).json({
        status: 'success',
        message: 'Match created successfully',
        data: { match: match[0] },
      });
    } catch (error) {
      next(error);
    }
  }
  
  // Record match results
  async recordMatchResults(req: Request, res: Response, next: NextFunction) {
    try {
      const { matchId } = req.params;
      const { results, playerStats } = req.body;
      const userId = req.user!.id;
      
      // Get match
      const matchResult = await db.select().from(matches)
        .where(eq(matches.id, parseInt(matchId)))
        .limit(1);
      
      if (matchResult.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Match not found',
        });
      }
      
      const match = matchResult[0];
      
      // Get scrim to check permissions
      const scrimResult = await db.select().from(scrims)
        .where(eq(scrims.id, match.scrimId))
        .limit(1);
      
      if (scrimResult.length === 0) {
        return res.status(404).json({
          status: 'error', 
          message: 'Scrim not found',
        });
      }
      
      const scrim = scrimResult[0];
      
      // Check permissions (only creator can record results)
      if (scrim.creatorId !== userId) {
        return res.status(403).json({
          status: 'error',
          message: 'Only the creator can record results for this match',
        });
      }
      
      // Check if match already has results
      const existingResults = await db.select().from(matchResults)
        .where(eq(matchResults.matchId, match.id))
        .limit(1);
      
      if (existingResults.length > 0) {
        // Delete existing results
        await db.delete(matchResults)
          .where(eq(matchResults.matchId, match.id));
      }
      
      // Record match results
      const matchResultPromises = results.map((result: any) => 
        db.insert(matchResults)
          .values({
            matchId: match.id,
            teamId: result.teamId,
            placement: result.placement,
            score: result.score || 0,
          })
      );
      
      await Promise.all(matchResultPromises);
      
      // Record player stats if provided
      if (playerStats && playerStats.length > 0) {
        // Remove existing player stats
        await db.delete(playerMatchStats)
          .where(eq(playerMatchStats.matchId, match.id));
        
        // Insert new player stats
        const playerStatsPromises = playerStats.map((stat: any) => 
          db.insert(playerMatchStats)
            .values({
              matchId: match.id,
              userId: stat.userId,
              kills: stat.kills || 0,
              deaths: stat.deaths || 0,
              assists: stat.assists || 0,
              damageDealt: stat.damageDealt || 0,
            })
        );
        
        await Promise.all(playerStatsPromises);
      }
      
      // Update match to completed
      await db.update(matches)
        .set({
          endTime: new Date(),
        })
        .where(eq(matches.id, match.id));
      
      res.status(200).json({
        status: 'success',
        message: 'Match results recorded successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}