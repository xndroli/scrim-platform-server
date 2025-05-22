// src/services/apex/apex-api.service.ts
import axios from 'axios';
import { config } from '../../config/environment';
import { db } from '../../db';
import { apexAccounts, apexStats } from '../../db/schema';
import { eq } from 'drizzle-orm';

interface ApexPlayer {
  global: {
    name: string;
    uid: string;
    platform: string;
    level: number;
    rank: {
      rankName: string;
      rankDiv: number;
      rankImg: string;
      rankedSeason: string;
    };
  };
  realtime: {
    lobbyState: string;
    isOnline: number;
    isInGame: number;
    canJoin: number;
    selectedLegend: string;
  };
  legends: {
    selected: {
      LegendName: string;
      data: Array<{
        name: string;
        value: number;
        key: string;
      }>;
    };
  };
}

export class ApexAPIService {
  private baseURL = 'https://api.mozambiquehe.re/';
  private headers: Record<string, string>;

  constructor() {
    this.headers = {
      'Authorization': config.APEX_API_KEY,
      'Content-Type': 'application/json',
    };
  }

  async getPlayerStats(username: string, platform: string): Promise<ApexPlayer | null> {
    try {
      const response = await axios.get(
        `${this.baseURL}bridge?player=${username}&platform=${platform}`,
        { headers: this.headers }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to fetch Apex stats:', error);
      return null;
    }
  }

  async verifyAndLinkAccount(userId: string, username: string, platform: string, verificationCode: string) {
    // First, get player stats
    const playerStats = await this.getPlayerStats(username, platform);
    
    if (!playerStats) {
      throw new Error('Player not found');
    }

    // Check if player has verification code in their club tag or status
    // This is a simplified version - you might want to use a different verification method
    const isVerified = await this.verifyOwnership(username, platform, verificationCode);
    
    if (!isVerified) {
      throw new Error('Verification failed. Please ensure the verification code is in your club tag.');
    }

    // Store the linked account
    const apexAccount = await db.insert(apexAccounts)
      .values({
        userId,
        username,
        platform,
        apexUid: playerStats.global.uid,
        isVerified: true,
        lastUpdated: new Date(),
      })
      .returning();

    // Store initial stats
    await this.updatePlayerStats(userId);

    return apexAccount[0];
  }

  private async verifyOwnership(username: string, platform: string, verificationCode: string): Promise<boolean> {
    // In a real implementation, you might:
    // 1. Check club tag for verification code
    // 2. Use OAuth if available
    // 3. Check recent match history for a specific action
    // For now, we'll simulate verification
    
    // You could implement a webhook system where players need to perform
    // a specific action in-game that can be tracked via the API
    
    return true; // Simplified for example
  }

  async updatePlayerStats(userId: string) {
    const account = await db.select()
      .from(apexAccounts)
      .where(eq(apexAccounts.userId, userId))
      .limit(1);

    if (!account[0]) {
      throw new Error('Apex account not linked');
    }

    const stats = await this.getPlayerStats(account[0].username, account[0].platform);
    
    if (!stats) {
      throw new Error('Failed to fetch stats');
    }

    // Extract relevant stats
    const kills = stats.legends.selected.data.find(d => d.key === 'kills')?.value || 0;
    const damage = stats.legends.selected.data.find(d => d.key === 'damage')?.value || 0;
    const wins = stats.legends.selected.data.find(d => d.key === 'wins')?.value || 0;

    // Update database
    await db.insert(apexStats)
      .values({
        userId,
        level: stats.global.level,
        rankName: stats.global.rank.rankName,
        rankDivision: stats.global.rank.rankDiv,
        rankPoints: 0, // Would need to calculate based on rank
        totalKills: kills,
        totalDamage: damage,
        totalWins: wins,
        lastUpdated: new Date(),
      })
      .onConflictDoUpdate({
        target: apexStats.userId,
        set: {
          level: stats.global.level,
          rankName: stats.global.rank.rankName,
          rankDivision: stats.global.rank.rankDiv,
          totalKills: kills,
          totalDamage: damage,
          totalWins: wins,
          lastUpdated: new Date(),
        },
      });

    return stats;
  }

  async checkPlayerAvailability(userId: string): Promise<boolean> {
    const account = await db.select()
      .from(apexAccounts)
      .where(eq(apexAccounts.userId, userId))
      .limit(1);

    if (!account[0]) return false;

    const stats = await this.getPlayerStats(account[0].username, account[0].platform);
    
    if (!stats) return false;

    // Check if player is not in a game
    return stats.realtime.isInGame === 0;
  }

  async getMatchHistory(userId: string) {
    // This would require additional API endpoints
    // The Apex Legends API has limited match history access
    // You might need to use additional services or track matches yourself
    
    const account = await db.select()
      .from(apexAccounts)
      .where(eq(apexAccounts.userId, userId))
      .limit(1);

    if (!account[0]) {
      throw new Error('Apex account not linked');
    }

    // Placeholder for match history
    // In production, you'd integrate with match tracking APIs
    return [];
  }
}

export const apexAPI = new ApexAPIService();