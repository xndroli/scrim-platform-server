"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.teamsRelations = exports.usersRelations = exports.playerMatchStats = exports.matchResults = exports.matches = exports.scrimParticipants = exports.scrims = exports.teamMembers = exports.teams = exports.users = void 0;
// src/db/schema.ts
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
// Users table
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).notNull().unique(),
    username: (0, pg_core_1.varchar)('username', { length: 50 }).notNull().unique(),
    passwordHash: (0, pg_core_1.varchar)('password_hash', { length: 255 }).notNull(),
    profileImage: (0, pg_core_1.text)('profile_image'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
// Teams table
exports.teams = (0, pg_core_1.pgTable)('teams', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    logo: (0, pg_core_1.text)('logo'),
    ownerId: (0, pg_core_1.integer)('owner_id').references(() => exports.users.id).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
// Team members
exports.teamMembers = (0, pg_core_1.pgTable)('team_members', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    teamId: (0, pg_core_1.integer)('team_id').references(() => exports.teams.id, { onDelete: 'cascade' }).notNull(),
    userId: (0, pg_core_1.integer)('user_id').references(() => exports.users.id, { onDelete: 'cascade' }).notNull(),
    role: (0, pg_core_1.varchar)('role', { length: 20 }).default('player').notNull(),
    joinedAt: (0, pg_core_1.timestamp)('joined_at').defaultNow().notNull(),
}, (table) => {
    return {
        teamUserIdx: (0, pg_core_1.uniqueIndex)('team_user_idx').on(table.teamId, table.userId),
    };
});
// Scrims table
exports.scrims = (0, pg_core_1.pgTable)('scrims', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    title: (0, pg_core_1.varchar)('title', { length: 100 }).notNull(),
    game: (0, pg_core_1.varchar)('game', { length: 50 }).notNull(),
    scheduledAt: (0, pg_core_1.timestamp)('scheduled_at').notNull(),
    creatorId: (0, pg_core_1.integer)('creator_id').references(() => exports.users.id).notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 20 }).default('scheduled').notNull(),
    maxTeams: (0, pg_core_1.integer)('max_teams').default(20).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
// Scrim participants
exports.scrimParticipants = (0, pg_core_1.pgTable)('scrim_participants', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    scrimId: (0, pg_core_1.integer)('scrim_id').references(() => exports.scrims.id, { onDelete: 'cascade' }).notNull(),
    teamId: (0, pg_core_1.integer)('team_id').references(() => exports.teams.id, { onDelete: 'cascade' }).notNull(),
    joinedAt: (0, pg_core_1.timestamp)('joined_at').defaultNow().notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 20 }).default('confirmed').notNull(),
}, (table) => {
    return {
        scrimTeamIdx: (0, pg_core_1.uniqueIndex)('scrim_team_idx').on(table.scrimId, table.teamId),
    };
});
// Matches table
exports.matches = (0, pg_core_1.pgTable)('matches', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    scrimId: (0, pg_core_1.integer)('scrim_id').references(() => exports.scrims.id, { onDelete: 'cascade' }).notNull(),
    mapName: (0, pg_core_1.varchar)('map_name', { length: 100 }),
    startTime: (0, pg_core_1.timestamp)('start_time'),
    endTime: (0, pg_core_1.timestamp)('end_time'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
// Match results
exports.matchResults = (0, pg_core_1.pgTable)('match_results', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    matchId: (0, pg_core_1.integer)('match_id').references(() => exports.matches.id, { onDelete: 'cascade' }).notNull(),
    teamId: (0, pg_core_1.integer)('team_id').notNull(),
    placement: (0, pg_core_1.integer)('placement').notNull(),
    score: (0, pg_core_1.integer)('score').default(0).notNull(),
}, (table) => {
    return {
        matchTeamIdx: (0, pg_core_1.uniqueIndex)('match_team_idx').on(table.matchId, table.teamId),
    };
});
// Player match stats
exports.playerMatchStats = (0, pg_core_1.pgTable)('player_match_stats', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    matchId: (0, pg_core_1.integer)('match_id').references(() => exports.matches.id, { onDelete: 'cascade' }).notNull(),
    userId: (0, pg_core_1.integer)('user_id').notNull(),
    kills: (0, pg_core_1.integer)('kills').default(0).notNull(),
    deaths: (0, pg_core_1.integer)('deaths').default(0).notNull(),
    assists: (0, pg_core_1.integer)('assists').default(0).notNull(),
    damageDealt: (0, pg_core_1.integer)('damage_dealt').default(0).notNull(),
}, (table) => {
    return {
        matchPlayerIdx: (0, pg_core_1.uniqueIndex)('match_player_idx').on(table.matchId, table.userId),
    };
});
// Relations
exports.usersRelations = (0, drizzle_orm_1.relations)(exports.users, ({ many }) => ({
    playerTeams: many(exports.teamMembers),
    ownedTeams: many(exports.teams),
    createdScrims: many(exports.scrims),
}));
exports.teamsRelations = (0, drizzle_orm_1.relations)(exports.teams, ({ one, many }) => ({
    owner: one(exports.users, {
        fields: [exports.teams.ownerId],
        references: [exports.users.id],
    }),
    members: many(exports.teamMembers),
    scrims: many(exports.scrimParticipants),
}));
// Additional relations for other tables...
