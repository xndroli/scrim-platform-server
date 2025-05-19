import { z } from 'zod';

export const scrimValidators = {
  createScrim: z.object({
    body: z.object({
      title: z.string().min(3).max(100),
      game: z.string().min(1).max(50),
      scheduledAt: z.string().datetime(),
      maxTeams: z.number().int().min(2).max(100).optional(),
    }),
  }),
  
  updateScrim: z.object({
    params: z.object({
      scrimId: z.string().transform(val => parseInt(val)),
    }),
    body: z.object({
      title: z.string().min(3).max(100).optional(),
      game: z.string().min(1).max(50).optional(),
      scheduledAt: z.string().datetime().optional(),
      status: z.enum(['scheduled', 'in-progress', 'completed', 'cancelled']).optional(),
      maxTeams: z.number().int().min(2).max(100).optional(),
    }),
  }),
  
  joinScrim: z.object({
    params: z.object({
      scrimId: z.string().transform(val => parseInt(val)),
    }),
    body: z.object({
      teamId: z.number().int(),
    }),
  }),
  
  createMatch: z.object({
    params: z.object({
      scrimId: z.string().transform(val => parseInt(val)),
    }),
    body: z.object({
      mapName: z.string().optional(),
    }),
  }),
  
  recordResults: z.object({
    params: z.object({
      matchId: z.string().transform(val => parseInt(val)),
    }),
    body: z.object({
      results: z.array(z.object({
        teamId: z.number().int(),
        placement: z.number().int().min(1),
        score: z.number().int().min(0).optional(),
      })),
      playerStats: z.array(z.object({
        userId: z.number().int(),
        kills: z.number().int().min(0).optional(),
        deaths: z.number().int().min(0).optional(),
        assists: z.number().int().min(0).optional(),
        damageDealt: z.number().int().min(0).optional(),
      })).optional(),
    }),
  }),
};