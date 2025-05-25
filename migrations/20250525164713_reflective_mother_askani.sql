CREATE TABLE "apex_player_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"season" integer NOT NULL,
	"level" integer DEFAULT 0,
	"kills" integer DEFAULT 0,
	"damage" integer DEFAULT 0,
	"matches" integer DEFAULT 0,
	"wins" integer DEFAULT 0,
	"top5s" integer DEFAULT 0,
	"kd" integer DEFAULT 0,
	"rankScore" integer DEFAULT 0,
	"rankTier" varchar(20),
	"rankDiv" integer DEFAULT 0,
	"rankedKills" integer DEFAULT 0,
	"rankedDamage" integer DEFAULT 0,
	"rankedMatches" integer DEFAULT 0,
	"rankedWins" integer DEFAULT 0,
	"legendStats" jsonb,
	"recordedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discord_guilds" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"icon" text,
	"ownerId" text NOT NULL,
	"scrimCategoryId" text,
	"teamCategoryId" text,
	"isActive" boolean DEFAULT true,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discord_scrim_channels" (
	"id" serial PRIMARY KEY NOT NULL,
	"scrimId" integer NOT NULL,
	"guildId" text NOT NULL,
	"textChannelId" text NOT NULL,
	"voiceChannelIds" text[],
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "match_results" ADD COLUMN "totalKills" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "match_results" ADD COLUMN "totalDamage" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "match_results" ADD COLUMN "survivalTime" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "discordNotified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "discordMessageId" text;--> statement-breakpoint
ALTER TABLE "player_match_stats" ADD COLUMN "legend" varchar(50);--> statement-breakpoint
ALTER TABLE "player_match_stats" ADD COLUMN "revives" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "player_match_stats" ADD COLUMN "respawns" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "player_match_stats" ADD COLUMN "survivalTime" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "scrim_participants" ADD COLUMN "discordVerified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "scrim_participants" ADD COLUMN "apexVerified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "scrim_participants" ADD COLUMN "eligibilityChecked" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "scrim_participants" ADD COLUMN "eligibilityNotes" text;--> statement-breakpoint
ALTER TABLE "scrims" ADD COLUMN "minLevel" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "scrims" ADD COLUMN "maxLevel" integer;--> statement-breakpoint
ALTER TABLE "scrims" ADD COLUMN "minRankScore" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "scrims" ADD COLUMN "maxRankScore" integer;--> statement-breakpoint
ALTER TABLE "scrims" ADD COLUMN "allowedRankTiers" text[];--> statement-breakpoint
ALTER TABLE "scrims" ADD COLUMN "requireDiscord" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "scrims" ADD COLUMN "requireApex" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "scrims" ADD COLUMN "discordNotified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "team_members" ADD COLUMN "apexLevelAtJoin" integer;--> statement-breakpoint
ALTER TABLE "team_members" ADD COLUMN "apexRankAtJoin" varchar(20);--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "requireDiscord" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "requireApex" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "minApexLevel" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "maxApexLevel" integer;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "allowedRankTiers" text[];--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "discordRoleId" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "discordChannelId" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "discordId" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "discordUsername" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "discordAvatar" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "discordLinkedAt" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "apexPlayerId" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "apexPlayerName" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "apexPlatform" varchar(10);--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "apexLevel" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "apexRankScore" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "apexRankTier" varchar(20);--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "apexLinkedAt" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "apexLastSync" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "apexVerified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "apex_player_stats" ADD CONSTRAINT "apex_player_stats_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discord_scrim_channels" ADD CONSTRAINT "discord_scrim_channels_scrimId_scrims_id_fk" FOREIGN KEY ("scrimId") REFERENCES "public"."scrims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discord_scrim_channels" ADD CONSTRAINT "discord_scrim_channels_guildId_discord_guilds_id_fk" FOREIGN KEY ("guildId") REFERENCES "public"."discord_guilds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_season_stats_idx" ON "apex_player_stats" USING btree ("userId","season");--> statement-breakpoint
CREATE UNIQUE INDEX "scrim_guild_idx" ON "discord_scrim_channels" USING btree ("scrimId","guildId");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_discordId_unique" UNIQUE("discordId");