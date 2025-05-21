// src/db/schema.ts
import { pgTable, uuid, text, integer, timestamp, varchar, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table (synced with Clerk)
export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // Maps to Clerk user ID
  email: varchar('email', { length: 255 }).notNull(),
  username: varchar('username', { length: 50 }).notNull(),
  clerkId: varchar('clerk_id', { length: 255 }).notNull().unique(), // Store Clerk's user ID
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  profileImageUrl: text('profile_image_url'),
  lastSignIn: timestamp('last_sign_in'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Teams table
export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  logo: text('logo'),
  ownerId: uuid('owner_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Team members
export const teamMembers = pgTable('team_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: varchar('role', { length: 20 }).default('player').notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (table) => {
  return {
    teamUserIdx: uniqueIndex('team_user_idx').on(table.teamId, table.userId),
  };
});

// Scrims table
export const scrims = pgTable('scrims', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 100 }).notNull(),
  game: varchar('game', { length: 50 }).notNull(),
  scheduledAt: timestamp('scheduled_at').notNull(),
  creatorId: uuid('creator_id').references(() => users.id).notNull(),
  status: varchar('status', { length: 20 }).default('scheduled').notNull(),
  maxTeams: integer('max_teams').default(20).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Scrim participants
export const scrimParticipants = pgTable('scrim_participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  scrimId: uuid('scrim_id').references(() => scrims.id, { onDelete: 'cascade' }).notNull(),
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }).notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  status: varchar('status', { length: 20 }).default('confirmed').notNull(),
}, (table) => {
  return {
    scrimTeamIdx: uniqueIndex('scrim_team_idx').on(table.scrimId, table.teamId),
  };
});

// Matches table
export const matches = pgTable('matches', {
  id: uuid('id').primaryKey().defaultRandom(),
  scrimId: uuid('scrim_id').references(() => scrims.id, { onDelete: 'cascade' }).notNull(),
  mapName: varchar('map_name', { length: 100 }),
  startTime: timestamp('start_time'),
  endTime: timestamp('end_time'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Match results
export const matchResults = pgTable('match_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  matchId: uuid('match_id').references(() => matches.id, { onDelete: 'cascade' }).notNull(),
  teamId: uuid('team_id').references(() => teams.id).notNull(),
  placement: integer('placement').notNull(),
  score: integer('score').default(0).notNull(),
}, (table) => {
  return {
    matchTeamIdx: uniqueIndex('match_team_idx').on(table.matchId, table.teamId),
  };
});

// Player match stats
export const playerMatchStats = pgTable('player_match_stats', {
  id: uuid('id').primaryKey().defaultRandom(),
  matchId: uuid('match_id').references(() => matches.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
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