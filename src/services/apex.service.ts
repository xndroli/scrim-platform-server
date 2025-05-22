// src/services/apex.service.ts
import axios, { AxiosInstance } from 'axios';
import { config } from '../config/environment';

interface ApexPlayer {
  playerId: string;
  playerName: string;
  playerTag?: string;
  platform: 'PC' | 'PS4' | 'PS5' | 'XBOX' | 'SWITCH';
  level: number;
  rankScore: number;
  currentRank: {
    rankName: string;
    rankDiv: number;
    rankImg: string;
  };
  legends: ApexLegend[];
  lastPlayed: string;
}

interface ApexLegend {
  legendName: string;
  kills: number;
  wins: number;
  matches: number;
  damage: number;
}

interface ApexMatchHistory {
  matchId: string;
  gameMode: string;
  map: string;
  legend: string;
  placement: number;
  kills: number;
  damage: number;
  matchLength: number;
  timestamp: string;
}

interface ApexStats {
  playerId: string;
  globalStats: {
    level: number;
    kills: number;
    damage: number;
    matches: number;
    wins: number;
    top5s: number;
    kd: number;
    winRate: number;
  };
  rankedStats: {
    currentSeason: number;
    rankScore: number;
    rankName: string;
    rankDiv: number;
    kills: number;
    damage: number;
    matches: number;
    wins: number;
    kd: number;
  };
  legendStats: ApexLegend[];
}

export class ApexLegendsService {
  private apiClient: AxiosInstance;
  private baseURL = 'https://api.mozambiquehe.re';

  constructor() {
    this.apiClient = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${config.APEX_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.apiClient.interceptors.request.use(
      (config) => {
        console.log(`🎮 Apex API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ Apex API Request Error:', error);
        return Promise.reject(error);
      }
    );

    this.apiClient.interceptors.response.use(
      (response) => {
        console.log(`✅ Apex API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('❌ Apex API Response Error:', error.response?.data || error.message);
        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  private handleApiError(error: any): Error {
    if (error.response) {
      const { status, data } = error.response;
      switch (status) {
        case 404:
          return new Error('Player not found or invalid platform');
        case 429:
          return new Error('API rate limit exceeded. Please try again later');
        case 400:
          return new Error('Invalid request parameters');
        case 403:
          return new Error('Access forbidden - check API key');
        default:
          return new Error(data?.message || 'Apex API error occurred');
      }
    }
    return new Error('Network error - unable to reach Apex API');
  }

  async searchPlayer(playerName: string, platform: string): Promise<ApexPlayer | null> {
    try {
      const response = await this.apiClient.get('/bridge', {
        params: {
          player: playerName,
          platform: platform.toLowerCase(),
          auth: config.APEX_API_KEY
        }
      });

      const data = response.data;

      if (data.Error) {
        throw new Error(data.Error);
      }

      return this.transformPlayerData(data);
    } catch (error) {
      console.error('❌ Failed to search Apex player:', error);
      throw error;
    }
  }

  async getPlayerStats(playerId: string, platform: string): Promise<ApexStats> {
    try {
      const response = await this.apiClient.get('/bridge', {
        params: {
          player: playerId,
          platform: platform.toLowerCase(),
          auth: config.APEX_API_KEY
        }
      });

      const data = response.data;

      if (data.Error) {
        throw new Error(data.Error);
      }

      return this.transformStatsData(data);
    } catch (error) {
      console.error('❌ Failed to get Apex player stats:', error);
      throw error;
    }
  }

  async getMatchHistory(playerId: string, platform: string): Promise<ApexMatchHistory[]> {
    try {
      // Note: Match history might require different endpoint or additional API access
      const response = await this.apiClient.get('/games', {
        params: {
          player: playerId,
          platform: platform.toLowerCase(),
          auth: config.APEX_API_KEY
        }
      });

      const data = response.data;

      if (data.Error) {
        throw new Error(data.Error);
      }

      return this.transformMatchHistoryData(data);
    } catch (error) {
      console.error('❌ Failed to get match history:', error);
      // Return empty array if match history is not available
      return [];
    }
  }

  async validatePlayer(playerName: string, platform: string): Promise<boolean> {
    try {
      const player = await this.searchPlayer(playerName, platform);
      return player !== null;
    } catch (error) {
      return false;
    }
  }

  async getRankInfo(playerId: string, platform: string): Promise<any> {
    try {
      const stats = await this.getPlayerStats(playerId, platform);
      return stats.rankedStats;
    } catch (error) {
      console.error('❌ Failed to get rank info:', error);
      throw error;
    }
  }

  // Transform raw API data to our interfaces
  private transformPlayerData(data: any): ApexPlayer {
    const global = data.global || {};
    const legends = data.legends || {};
    
    // Get current legend data
    const activeLegends = Object.keys(legends).map(legendName => {
      const legend = legends[legendName];
      return {
        legendName,
        kills: legend.data?.[0]?.value || 0,
        wins: legend.data?.[2]?.value || 0,
        matches: legend.data?.[1]?.value || 0,
        damage: legend.data?.[3]?.value || 0,
      };
    }).filter(legend => legend.kills > 0);

    // Get rank info
    const rankData = global.rank || {};
    const currentRank = {
      rankName: rankData.rankName || 'Unranked',
      rankDiv: rankData.rankDiv || 0,
      rankImg: rankData.rankImg || '',
    };

    return {
      playerId: data.global?.uid || '',
      playerName: data.global?.name || '',
      playerTag: data.global?.tag || '',
      platform: this.normalizePlatform(data.global?.platform || ''),
      level: global.level || 0,
      rankScore: rankData.rankScore || 0,
      currentRank,
      legends: activeLegends,
      lastPlayed: new Date().toISOString(), // API doesn't provide this
    };
  }

  private transformStatsData(data: any): ApexStats {
    const global = data.global || {};
    const rankData = global.rank || {};
    const legends = data.legends || {};

    const globalStats = {
      level: global.level || 0,
      kills: global.kills?.value || 0,
      damage: global.damage?.value || 0,
      matches: global.matches_played?.value || 0,
      wins: global.wins?.value || 0,
      top5s: global.top5s?.value || 0,
      kd: global.kd?.value || 0,
      winRate: global.winRate?.value || 0,
    };

    const rankedStats = {
      currentSeason: global.season || 0,
      rankScore: rankData.rankScore || 0,
      rankName: rankData.rankName || 'Unranked',
      rankDiv: rankData.rankDiv || 0,
      kills: rankData.kills || 0,
      damage: rankData.damage || 0,
      matches: rankData.matches || 0,
      wins: rankData.wins || 0,
      kd: rankData.kd || 0,
    };

    const legendStats = Object.keys(legends).map(legendName => {
      const legend = legends[legendName];
      return {
        legendName,
        kills: legend.data?.[0]?.value || 0,
        wins: legend.data?.[2]?.value || 0,
        matches: legend.data?.[1]?.value || 0,
        damage: legend.data?.[3]?.value || 0,
      };
    });

    return {
      playerId: global.uid || '',
      globalStats,
      rankedStats,
      legendStats,
    };
  }

  private transformMatchHistoryData(data: any): ApexMatchHistory[] {
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((match: any) => ({
      matchId: match.id || '',
      gameMode: match.gameMode || 'Unknown',
      map: match.map || 'Unknown',
      legend: match.legend || 'Unknown',
      placement: match.placement || 0,
      kills: match.kills || 0,
      damage: match.damage || 0,
      matchLength: match.duration || 0,
      timestamp: match.timestamp || new Date().toISOString(),
    }));
  }

  private normalizePlatform(platform: string): 'PC' | 'PS4' | 'PS5' | 'XBOX' | 'SWITCH' {
    const normalizedPlatform = platform.toUpperCase();
    switch (normalizedPlatform) {
      case 'ORIGIN':
      case 'STEAM':
      case 'PC':
        return 'PC';
      case 'PSN':
      case 'PS4':
        return 'PS4';
      case 'PS5':
        return 'PS5';
      case 'XBOX':
      case 'X1':
        return 'XBOX';
      case 'SWITCH':
        return 'SWITCH';
      default:
        return 'PC';
    }
  }

  // Utility methods for scrim platform integration
  async getPlayerEligibility(playerId: string, platform: string): Promise<{
    eligible: boolean;
    reason?: string;
    rankTier?: string;
    level?: number;
  }> {
    try {
      const stats = await this.getPlayerStats(playerId, platform);
      
      // Define eligibility criteria
      const minLevel = 10; // Minimum level to participate
      const minRankScore = 0; // Minimum rank score (0 allows all ranks)
      
      const eligible = stats.globalStats.level >= minLevel && 
                      stats.rankedStats.rankScore >= minRankScore;
      
      if (!eligible) {
        let reason = '';
        if (stats.globalStats.level < minLevel) {
          reason = `Minimum level ${minLevel} required (current: ${stats.globalStats.level})`;
        } else if (stats.rankedStats.rankScore < minRankScore) {
          reason = `Minimum rank required`;
        }
        
        return {
          eligible: false,
          reason,
          level: stats.globalStats.level,
          rankTier: stats.rankedStats.rankName,
        };
      }
      
      return {
        eligible: true,
        level: stats.globalStats.level,
        rankTier: stats.rankedStats.rankName,
      };
    } catch (error) {
      return {
        eligible: false,
        reason: 'Unable to verify player stats',
      };
    }
  }

  async getTeamAverageRank(playerIds: string[], platform: string): Promise<{
    averageRankScore: number;
    averageLevel: number;
    teamRankTier: string;
  }> {
    try {
      const playerStats = await Promise.all(
        playerIds.map(id => this.getPlayerStats(id, platform))
      );

      const totalRankScore = playerStats.reduce((sum, stats) => sum + stats.rankedStats.rankScore, 0);
      const totalLevel = playerStats.reduce((sum, stats) => sum + stats.globalStats.level, 0);
      
      const averageRankScore = totalRankScore / playerStats.length;
      const averageLevel = totalLevel / playerStats.length;
      
      const teamRankTier = this.getRankTierFromScore(averageRankScore);
      
      return {
        averageRankScore,
        averageLevel,
        teamRankTier,
      };
    } catch (error) {
      console.error('❌ Failed to calculate team average rank:', error);
      throw error;
    }
  }

  private getRankTierFromScore(rankScore: number): string {
    if (rankScore >= 15000) return 'Master';
    if (rankScore >= 11400) return 'Diamond';
    if (rankScore >= 8400) return 'Platinum';
    if (rankScore >= 5400) return 'Gold';
    if (rankScore >= 2800) return 'Silver';
    if (rankScore >= 1000) return 'Bronze';
    return 'Rookie';
  }

  // Method to check if API is available
  async checkApiHealth(): Promise<boolean> {
    try {
      // Test with a simple request
      await this.apiClient.get('/bridge', {
        params: {
          player: 'test',
          platform: 'pc',
          auth: config.APEX_API_KEY
        }
      });
      return true;
    } catch (error) {
      // If it's just a player not found error, API is working
      if (error.message.includes('not found')) {
        return true;
      }
      return false;
    }
  }
}

// Singleton instance
export const apexService = new ApexLegendsService();