import { Request, Response, NextFunction } from 'express';
import { db } from '../../db';
import { teams, teamMembers, users } from '../../db/schema';
import { eq, and, inArray } from 'drizzle-orm';

export class TeamController {
  async createTeam(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, logo } = req.body;
      const userId = req.user!.userId;
      
      // Create team
      const newTeam = await db.insert(teams)
        .values({
          name,
          logo,
          ownerId: userId,
          updatedAt: new Date(),
        })
        .returning();
      
      // Add owner as team member with 'owner' role
      await db.insert(teamMembers)
        .values({
          teamId: newTeam[0].id,
          userId,
          role: 'owner',
        });
      
      res.status(201).json({
        status: 'success',
        message: 'Team created successfully',
        data: { team: newTeam[0] },
      });
    } catch (error) {
      next(error);
    }
  }
  
  async getTeams(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      
      // Get teams user is a member of
      const userTeams = await db.select({
        teamId: teamMembers.teamId,
      })
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId));
      
      const teamIds = userTeams.map(t => t.teamId);
      
      if (teamIds.length === 0) {
        return res.status(200).json({
          status: 'success',
          data: { teams: [] },
        });
      }
      
      // Get team details - using inArray instead of multiple eq conditions
      const teamsData = await db.select().from(teams)
        .where(inArray(teams.id, teamIds));
      
      res.status(200).json({
        status: 'success',
        data: { teams: teamsData },
      });
    } catch (error) {
      next(error);
    }
  }
  
  async getTeam(req: Request, res: Response, next: NextFunction) {
    try {
      const { teamId } = req.params;
      const userId = req.user!.userId;
      
      // Get team
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
      
      // Check if user is a member
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
      
      // Get team members
      const members = await db.select({
        id: teamMembers.id,
        userId: teamMembers.userId,
        role: teamMembers.role,
        joinedAt: teamMembers.joinedAt,
      })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, team.id));
      
      // Get usernames for members
      const userIds = members.map(m => m.userId);
      
      let usersData: any[] = [];
      if (userIds.length > 0) {
        usersData = await db.select({
          id: users.id,
          username: users.username,
          profileImage: users.profileImage,
        })
        .from(users)
        .where(inArray(users.id, userIds));
      }
      
      // Combine data
      const membersWithUserInfo = members.map(member => {
        const user = usersData.find(u => u.id === member.userId);
        return {
          ...member,
          username: user?.username,
          profileImage: user?.profileImage,
        };
      });
      
      const teamWithMembers = {
        ...team,
        members: membersWithUserInfo,
      };
      
      res.status(200).json({
        status: 'success',
        data: { team: teamWithMembers },
      });
    } catch (error) {
      next(error);
    }
  }
  
  async updateTeam(req: Request, res: Response, next: NextFunction) {
    try {
      const { teamId } = req.params;
      const { name, logo } = req.body;
      const userId = req.user!.userId;
      
      // Get team
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
      
      // Check if user is owner
      if (team.ownerId !== userId) {
        return res.status(403).json({
          status: 'error',
          message: 'Only team owner can update team details',
        });
      }
      
      // Build update object
      const updateData: any = {
        updatedAt: new Date(),
      };
      
      if (name !== undefined) {
        updateData.name = name;
      }
      
      if (logo !== undefined) {
        updateData.logo = logo;
      }
      
      // Update team
      const updatedTeam = await db.update(teams)
        .set(updateData)
        .where(eq(teams.id, team.id))
        .returning();
      
      res.status(200).json({
        status: 'success',
        message: 'Team updated successfully',
        data: { team: updatedTeam[0] },
      });
    } catch (error) {
      next(error);
    }
  }
  
  async addMember(req: Request, res: Response, next: NextFunction) {
    try {
      const { teamId } = req.params;
      const { username, role } = req.body;
      const userId = req.user!.userId;
      
      // Get team
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
      
      // Check if user is owner or manager
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
      
      const membership = membershipResult[0];
      
      if (!['owner', 'manager'].includes(membership.role)) {
        return res.status(403).json({
          status: 'error',
          message: 'You do not have permission to add members',
        });
      }
      
      // Find user by username
      const userResult = await db.select({
        id: users.id,
        username: users.username,
      })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
      
      if (userResult.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found',
        });
      }
      
      const userToAdd = userResult[0];
      
      // Check if user is already a member
      const existingMembershipResult = await db.select().from(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, team.id),
            eq(teamMembers.userId, userToAdd.id)
          )
        )
        .limit(1);
      
      if (existingMembershipResult.length > 0) {
        return res.status(400).json({
          status: 'error',
          message: 'User is already a member of this team',
        });
      }
      
      // Add user to team
      const newMember = await db.insert(teamMembers)
        .values({
          teamId: team.id,
          userId: userToAdd.id,
          role: role || 'player',
        })
        .returning();
      
      res.status(201).json({
        status: 'success',
        message: 'Member added successfully',
        data: {
          member: {
            ...newMember[0],
            username: userToAdd.username,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      const { teamId, memberId } = req.params;
      const userId = req.user!.userId;
      
      // Get team
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
      
      // Get member to remove
      const memberToRemoveResult = await db.select().from(teamMembers)
        .where(eq(teamMembers.id, parseInt(memberId)))
        .limit(1);
      
      if (memberToRemoveResult.length === 0 || memberToRemoveResult[0].teamId !== team.id) {
        return res.status(404).json({
          status: 'error',
          message: 'Team member not found',
        });
      }
      
      const memberToRemove = memberToRemoveResult[0];
      
      // Check permissions
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
      
      const membership = membershipResult[0];
      
      // Owner can remove anyone except themselves
      if (membership.role === 'owner') {
        if (memberToRemove.userId === userId) {
          return res.status(400).json({
            status: 'error',
            message: 'Owner cannot be removed from team',
          });
        }
      }
      // Manager can remove players but not other managers or owners
      else if (membership.role === 'manager') {
        if (memberToRemove.role !== 'player') {
          return res.status(403).json({
            status: 'error',
            message: 'Managers can only remove players',
          });
        }
      }
      // Players can only remove themselves
      else if (membership.role === 'player') {
        if (memberToRemove.userId !== userId) {
          return res.status(403).json({
            status: 'error',
            message: 'Players can only remove themselves',
          });
        }
      }
      
      // Remove member
      await db.delete(teamMembers)
        .where(eq(teamMembers.id, memberToRemove.id));
      
      res.status(200).json({
        status: 'success',
        message: 'Member removed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}