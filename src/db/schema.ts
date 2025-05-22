// src/db/schema.ts
import { pgTable, serial, text, timestamp, integer, uniqueIndex, varchar, boolean, primaryKey, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Auth required tables

// User table
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  role: text('role').default('user'),
  profileImage: text('profileImage'),
  twoFactorEnabled: boolean('twoFactorEnabled').default(false),

  // Discord Integration
  discordId: text('discordId').unique(),
  discordUsername: text('discordUsername'),
  discordAvatar: text('discordAvatar'),
  discordLinkedAt: timestamp('discordLinkedAt'),
  
  // Apex Legends Integration
  apexPlayerId: text('apexPlayerId'),
  apexPlayerName: text('apexPlayerName'),
  apexPlatform: varchar('apexPlatform', { length: 10 }), // PC, PS4, PS5, XBOX, SWITCH
  apexLevel: integer('apexLevel').default(0),
  apexRankScore: integer('apexRankScore').default(0),
  apexRankTier: varchar('apexRankTier', { length: 20 }),
  apexLinkedAt: timestamp('apexLinkedAt'),
  apexLastSync: timestamp('apexLastSync'),
  apexVerified: boolean('apexVerified').default(false),

  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

// Session table
export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
});

// Account table
export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

// Verification table
export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

// Two-factor authentication table
export const twoFactorTable = pgTable('twoFactor', {
  id: text('id').primaryKey(),
  secret: text('secret').notNull(),
  backupCodes: text('backupCodes').notNull(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

// Role-based access control tables

// Role Table
export const roleTable = pgTable('role', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  permissions: text('permissions').array(), // JSON array of permissions
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

// User Role Table
export const userRole = pgTable('userRole', {
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  roleId: text('roleId').notNull().references(() => roleTable.id, { onDelete: 'cascade' }),
  assignedAt: timestamp('assignedAt').notNull().defaultNow(),
}, (table) => [
  primaryKey({ name: 'pk', columns: [table.userId, table.roleId] })
]);

// Discord integration tables

// Discord Guild Integration
export const discordGuilds = pgTable('discord_guilds', {
  id: text('id').primaryKey(), // Discord Guild ID
  name: text('name').notNull(),
  icon: text('icon'),
  ownerId: text('ownerId').notNull(),
  scrimCategoryId: text('scrimCategoryId'),
  teamCategoryId: text('teamCategoryId'),
  isActive: boolean('isActive').default(true),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

// Discord Channels for Scrims
export const discordScrimChannels = pgTable('discord_scrim_channels', {
  id: serial('id').primaryKey(),
  scrimId: integer('scrimId').references(() => scrims.id, { onDelete: 'cascade' }).notNull(),
  guildId: text('guildId').references(() => discordGuilds.id).notNull(),
  textChannelId: text('textChannelId').notNull(),
  voiceChannelIds: text('voiceChannelIds').array(), // Array of voice channel IDs
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('scrim_guild_idx').on(table.scrimId, table.guildId),
]);

// Apex Legends integration tables

// Apex Legends Player Stats History
export const apexPlayerStats = pgTable('apex_player_stats', {
  id: serial('id').primaryKey(),
  userId: text('userId').references(() => user.id, { onDelete: 'cascade' }).notNull(),
  season: integer('season').notNull(),
  
  // Global Stats
  level: integer('level').default(0),
  kills: integer('kills').default(0),
  damage: integer('damage').default(0),
  matches: integer('matches').default(0),
  wins: integer('wins').default(0),
  top5s: integer('top5s').default(0),
  kd: integer('kd').default(0), // Stored as integer (multiply by 100)
  
  // Ranked Stats
  rankScore: integer('rankScore').default(0),
  rankTier: varchar('rankTier', { length: 20 }),
  rankDiv: integer('rankDiv').default(0),
  rankedKills: integer('rankedKills').default(0),
  rankedDamage: integer('rankedDamage').default(0),
  rankedMatches: integer('rankedMatches').default(0),
  rankedWins: integer('rankedWins').default(0),
  
  // Legend Stats (JSON)
  legendStats: jsonb('legendStats'), // Store as JSON array
  
  recordedAt: timestamp('recordedAt').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('user_season_stats_idx').on(table.userId, table.season),
]);

// Gaming tables

// Teams table - with user references
export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  logo: text('logo'),
  ownerId: text('owner_id').references(() => user.id).notNull(),
  
  // Team Requirements
  requireDiscord: boolean('requireDiscord').default(true),
  requireApex: boolean('requireApex').default(true),
  minApexLevel: integer('minApexLevel').default(1),
  maxApexLevel: integer('maxApexLevel'),
  allowedRankTiers: text('allowedRankTiers').array(),
  
  // Discord Integration
  discordRoleId: text('discordRoleId'),
  discordChannelId: text('discordChannelId'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Team members
export const teamMembers = pgTable('team_members', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').references(() => teams.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }).notNull(),
  role: varchar('role', { length: 20 }).default('player').notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),

  // Apex Stats at time of joining
  apexLevelAtJoin: integer('apexLevelAtJoin'),
  apexRankAtJoin: varchar('apexRankAtJoin', { length: 20 }),

}, (table) => [
  uniqueIndex('team_user_idx').on(table.teamId, table.userId),
]);

// Scrims table (with Discord integration)
export const scrims = pgTable('scrims', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 100 }).notNull(),
  game: varchar('game', { length: 50 }).notNull(),
  scheduledAt: timestamp('scheduled_at').notNull(),
  creatorId: text('creator_id').references(() => user.id).notNull(),
  status: varchar('status', { length: 20 }).default('scheduled').notNull(),
  maxTeams: integer('max_teams').default(20).notNull(),
  
  // Eligibility Requirements
  minLevel: integer('minLevel').default(1),
  maxLevel: integer('maxLevel'),
  minRankScore: integer('minRankScore').default(0),
  maxRankScore: integer('maxRankScore'),
  allowedRankTiers: text('allowedRankTiers').array(), // Array of allowed rank tiers
  
  // Discord Integration
  requireDiscord: boolean('requireDiscord').default(true),
  requireApex: boolean('requireApex').default(true),
  discordNotified: boolean('discordNotified').default(false),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Scrim participants table
export const scrimParticipants = pgTable('scrim_participants', {
  id: serial('id').primaryKey(),
  scrimId: integer('scrim_id').references(() => scrims.id, { onDelete: 'cascade' }).notNull(),
  teamId: integer('team_id').references(() => teams.id, { onDelete: 'cascade' }).notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  status: varchar('status', { length: 20 }).default('confirmed').notNull(),
  
  // Requirements verification
  discordVerified: boolean('discordVerified').default(false),
  apexVerified: boolean('apexVerified').default(false),
  eligibilityChecked: boolean('eligibilityChecked').default(false),
  eligibilityNotes: text('eligibilityNotes'),
  
}, (table) => [
    uniqueIndex('scrim_team_idx').on(table.scrimId, table.teamId),
]);

// Matches table
export const matches = pgTable('matches', {
  id: serial('id').primaryKey(),
  scrimId: integer('scrim_id').references(() => scrims.id, { onDelete: 'cascade' }).notNull(),
  mapName: varchar('map_name', { length: 100 }),
  startTime: timestamp('start_time'),
  endTime: timestamp('end_time'),
  
  // Discord Integration
  discordNotified: boolean('discordNotified').default(false),
  discordMessageId: text('discordMessageId'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Match results table
export const matchResults = pgTable('match_results', {
  id: serial('id').primaryKey(),
  matchId: integer('match_id').references(() => matches.id, { onDelete: 'cascade' }).notNull(),
  teamId: integer('team_id').notNull(),
  placement: integer('placement').notNull(),
  score: integer('score').default(0).notNull(),
  
  // Additional Apex-specific stats
  totalKills: integer('totalKills').default(0),
  totalDamage: integer('totalDamage').default(0),
  survivalTime: integer('survivalTime').default(0), // in seconds
  
}, (table) => [
    uniqueIndex('match_team_idx').on(table.matchId, table.teamId),
]);

// Player match stats
export const playerMatchStats = pgTable('player_match_stats', {
  id: serial('id').primaryKey(),
  matchId: integer('match_id').references(() => matches.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => user.id).notNull(),
  kills: integer('kills').default(0).notNull(),
  deaths: integer('deaths').default(0).notNull(),
  assists: integer('assists').default(0).notNull(),
  damageDealt: integer('damage_dealt').default(0).notNull(),
  
  // Apex-specific stats
  legend: varchar('legend', { length: 50 }),
  revives: integer('revives').default(0),
  respawns: integer('respawns').default(0),
  survivalTime: integer('survivalTime').default(0),
  
}, (table) => [
  uniqueIndex('match_player_idx').on(table.matchId, table.userId),
]);

// Relations
export const usersRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  teamMembers: many(teamMembers),
  ownedTeams: many(teams, { relationName: 'teamOwner' }),
  createdScrims: many(scrims, { relationName: 'scrimCreator' }),
  twoFactor: one(twoFactorTable),
  userRoles: many(userRole),
  apexStats: many(apexPlayerStats),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  owner: one(user, {
    fields: [teams.ownerId],
    references: [user.id],
    relationName: 'teamOwner',
  }),
  members: many(teamMembers),
  scrimParticipations: many(scrimParticipants),
}));

export const scrimsRelations = relations(scrims, ({ one, many }) => ({
  creator: one(user, {
    fields: [scrims.creatorId],
    references: [user.id],
    relationName: 'scrimCreator',
  }),
  participants: many(scrimParticipants),
  matches: many(matches),
  discordChannels: many(discordScrimChannels),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
  scrim: one(scrims, {
    fields: [matches.scrimId],
    references: [scrims.id],
  }),
  results: many(matchResults),
  playerStats: many(playerMatchStats),
}));

export const roleRelations = relations(roleTable, ({ many }) => ({
  userRoles: many(userRole),
}));

export const userRoleRelations = relations(userRole, ({ one }) => ({
  user: one(user, {
    fields: [userRole.userId],
    references: [user.id],
  }),
  role: one(roleTable, {
    fields: [userRole.roleId],
    references: [roleTable.id],
  }),
}));

export const apexStatsRelations = relations(apexPlayerStats, ({ one }) => ({
  user: one(user, {
    fields: [apexPlayerStats.userId],
    references: [user.id],
  }),
}));

export const discordGuildsRelations = relations(discordGuilds, ({ many }) => ({
  scrimChannels: many(discordScrimChannels),
}));

export const discordScrimChannelsRelations = relations(discordScrimChannels, ({ one }) => ({
  scrim: one(scrims, {
    fields: [discordScrimChannels.scrimId],
    references: [scrims.id],
  }),
  guild: one(discordGuilds, {
    fields: [discordScrimChannels.guildId],
    references: [discordGuilds.id],
  }),
}));

// Export types for TypeScript
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type Scrim = typeof scrims.$inferSelect;
export type MatchResult = typeof matchResults.$inferSelect;
export type PlayerMatchStat = typeof playerMatchStats.$inferSelect;
export type ApexPlayerStat = typeof apexPlayerStats.$inferSelect;
export type DiscordGuild = typeof discordGuilds.$inferSelect;
export type DiscordScrimChannel = typeof discordScrimChannels.$inferSelect;
