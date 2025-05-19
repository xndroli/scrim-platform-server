export interface Team {
  id: number;
  name: string;
  logo?: string;
  ownerId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamInput {
  name: string;
  logo?: string;
}

export interface TeamMember {
  id: number;
  teamId: number;
  userId: number;
  role: string;
  joinedAt: Date;
}

export interface TeamMemberInput {
  userId: number;
  role?: string;
}

export interface TeamResponse {
  id: number;
  name: string;
  logo?: string;
  ownerId: number;
  members?: TeamMemberResponse[];
}

export interface TeamMemberResponse {
  id: number;
  userId: number;
  username: string;
  role: string;
  joinedAt: Date;
}