import { z } from 'zod';

export const userValidators = {
  updateProfile: z.object({
    body: z.object({
      username: z.string().min(3).max(50).optional(),
      profileImage: z.string().url().optional(),
    }),
  }),
  
  changePassword: z.object({
    body: z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(8).max(100),
    }),
  }),
};