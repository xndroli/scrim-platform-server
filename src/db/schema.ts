// src/db/schema.ts
import { pgTable, serial, text, timestamp, integer, uniqueIndex, varchar, boolean, primaryKey } from 'drizzle-orm/pg-core';
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

// Gaming tables

// Teams table - with user references
export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  logo: text('logo'),
  ownerId: text('owner_id').references(() => user.id).notNull(),
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
}, (table) => [
  uniqueIndex('team_user_idx').on(table.teamId, table.userId),
]);

// Scrims table
export const scrims = pgTable('scrims', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 100 }).notNull(),
  game: varchar('game', { length: 50 }).notNull(),
  scheduledAt: timestamp('scheduled_at').notNull(),
  creatorId: text('creator_id').references(() => user.id).notNull(),
  status: varchar('status', { length: 20 }).default('scheduled').notNull(),
  maxTeams: integer('max_teams').default(20).notNull(),
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
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Match results table
export const matchResults = pgTable('match_results', {
  id: serial('id').primaryKey(),
  matchId: integer('match_id').references(() => matches.id, { onDelete: 'cascade' }).notNull(),
  teamId: integer('team_id').notNull(),
  placement: integer('placement').notNull(),
  score: integer('score').default(0).notNull(),
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

// Export types for TypeScript
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type Scrim = typeof scrims.$inferSelect;
export type MatchResult = typeof matchResults.$inferSelect;
export type PlayerMatchStat = typeof playerMatchStats.$inferSelect;

