import { z } from 'zod';

export const authValidators = {
  register: z.object({
    username: z.string().min(3).max(30),
    email: z.string().email(),
    password: z.string().min(6),
  }),
  
  login: z.object({
    email: z.string().email(),
    password: z.string(),
  }),
  
  forgotPassword: z.object({
    email: z.string().email(),
  }),
  
  resetPassword: z.object({
    token: z.string(),
    password: z.string().min(6),
  }),
};
