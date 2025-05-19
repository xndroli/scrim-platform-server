import { z } from 'zod';

export const teamValidators = {
  createTeam: z.object({
    body: z.object({
      name: z.string().min(3).max(100),
      logo: z.string().url().optional(),
    }),
  }),
  
  updateTeam: z.object({
    params: z.object({
      teamId: z.string().transform(val => parseInt(val)),
    }),
    body: z.object({
      name: z.string().min(3).max(100).optional(),
      logo: z.string().url().optional(),
    }),
  }),
  
  addMember: z.object({
    params: z.object({
      teamId: z.string().transform(val => parseInt(val)),
    }),
    body: z.object({
      username: z.string(),
      role: z.enum(['player', 'coach', 'manager']).default('player'),
    }),
  }),
};