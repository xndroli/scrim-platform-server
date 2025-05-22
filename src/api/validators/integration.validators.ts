// src/api/validators/integration.validators.ts
import { z } from 'zod';

export const integrationValidators = {
  linkDiscord: z.object({
    body: z.object({
      discordId: z.string().min(17).max(19), // Discord snowflake IDs are 17-19 digits
      discordUsername: z.string().min(2).max(37), // Discord username limits
      discordAvatar: z.string().url().optional(),
    }),
  }),

  linkApex: z.object({
    body: z.object({
      apexPlayerName: z.string().min(1).max(50),
      apexPlatform: z.enum(['PC', 'PS4', 'PS5', 'XBOX', 'SWITCH']),
    }),
  }),

  checkScrimEligibility: z.object({
    params: z.object({
      scrimId: z.string().transform(val => parseInt(val)),
    }),
    body: z.object({
      teamId: z.number().int().positive(),
    }),
  }),
};