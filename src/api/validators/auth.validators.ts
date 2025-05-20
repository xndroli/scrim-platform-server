import { z } from 'zod';

export const authValidators = {
  register: z.object({
    body: z.object({
      username: z.string().min(3).max(50),
      email: z.string().email(),
      password: z.string().min(8).max(100),
    }),
  }),
  
  login: z.object({
    body: z.object({
      email: z.string().email(),
      password: z.string(),
    }),
  }),
};

