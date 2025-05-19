export interface Scrim {
  id: number;
  title: string;
  game: string;
  scheduledAt: Date;
  creatorId: number;
  status: string;
  maxTeams: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScrimInput {
  title: string;
  game: string;
  scheduledAt: string;
  maxTeams?: number;
}

export interface ScrimParticipant {
  id: number;
  scrimId: number;
  teamId: number;
  joinedAt: Date;
  status: string;
}

export interface ScrimResponse {
  id: number;
  title: string;
  game: string;
  scheduledAt: Date;
  creatorId: number;
  status: string;
  maxTeams: number;
  teams?: ScrimTeamResponse[];
}

export interface ScrimTeamResponse {
  id: number;
  teamId: number;
  teamName: string;
  status: string;
}

export interface Match {
  id: number;
  scrimId: number;
  mapName?: string;
  startTime?: Date;
  endTime?: Date;
  createdAt: Date;
}

export interface MatchInput {
  scrimId: number;
  mapName?: string;
  startTime?: string;
  endTime?: string;
}

export interface MatchResult {
  id: number;
  matchId: number;
  teamId: number;
  placement: number;
  score: number;
}

export interface PlayerMatchStat {
  id: number;
  matchId: number;
  userId: number;
  kills: number;
  deaths: number;
  assists: number;
  damageDealt: number;
}