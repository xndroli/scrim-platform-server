// src/db/schema.ts
import { pgTable, serial, text, timestamp, integer, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  profileImage: text('profile_image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Teams table
export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  logo: text('logo'),
  ownerId: integer('owner_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Team members
export const teamMembers = pgTable('team_members', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').references(() => teams.id, { onDelete: 'cascade' }).notNull(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: varchar('role', { length: 20 }).default('player').notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (table) => {
  return {
    teamUserIdx: uniqueIndex('team_user_idx').on(table.teamId, table.userId),
  };
});

// Scrims table
export const scrims = pgTable('scrims', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 100 }).notNull(),
  game: varchar('game', { length: 50 }).notNull(),
  scheduledAt: timestamp('scheduled_at').notNull(),
  creatorId: integer('creator_id').references(() => users.id).notNull(),
  status: varchar('status', { length: 20 }).default('scheduled').notNull(),
  maxTeams: integer('max_teams').default(20).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Scrim participants
export const scrimParticipants = pgTable('scrim_participants', {
  id: serial('id').primaryKey(),
  scrimId: integer('scrim_id').references(() => scrims.id, { onDelete: 'cascade' }).notNull(),
  teamId: integer('team_id').references(() => teams.id, { onDelete: 'cascade' }).notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  status: varchar('status', { length: 20 }).default('confirmed').notNull(),
}, (table) => {
  return {
    scrimTeamIdx: uniqueIndex('scrim_team_idx').on(table.scrimId, table.teamId),
  };
});

// Matches table
export const matches = pgTable('matches', {
  id: serial('id').primaryKey(),
  scrimId: integer('scrim_id').references(() => scrims.id, { onDelete: 'cascade' }).notNull(),
  mapName: varchar('map_name', { length: 100 }),
  startTime: timestamp('start_time'),
  endTime: timestamp('end_time'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Match results
export const matchResults = pgTable('match_results', {
  id: serial('id').primaryKey(),
  matchId: integer('match_id').references(() => matches.id, { onDelete: 'cascade' }).notNull(),
  teamId: integer('team_id').notNull(),
  placement: integer('placement').notNull(),
  score: integer('score').default(0).notNull(),
}, (table) => {
  return {
    matchTeamIdx: uniqueIndex('match_team_idx').on(table.matchId, table.teamId),
  };
});

// Player match stats
export const playerMatchStats = pgTable('player_match_stats', {
  id: serial('id').primaryKey(),
  matchId: integer('match_id').references(() => matches.id, { onDelete: 'cascade' }).notNull(),
  userId: integer('user_id').notNull(),
  kills: integer('kills').default(0).notNull(),
  deaths: integer('deaths').default(0).notNull(),
  assists: integer('assists').default(0).notNull(),
  damageDealt: integer('damage_dealt').default(0).notNull(),
}, (table) => {
  return {
    matchPlayerIdx: uniqueIndex('match_player_idx').on(table.matchId, table.userId),
  };
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  teamMembers: many(teamMembers),
  ownedTeams: many(teams, { relationName: 'teamOwner' }),
  createdScrims: many(scrims, { relationName: 'scrimCreator' }),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  owner: one(users, {
    fields: [teams.ownerId],
    references: [users.id],
    relationName: 'teamOwner',
  }),
  members: many(teamMembers),
  scrimParticipations: many(scrimParticipants),
}));

export const scrimsRelations = relations(scrims, ({ one, many }) => ({
  creator: one(users, {
    fields: [scrims.creatorId],
    references: [users.id],
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

// Additional relations for other tables...