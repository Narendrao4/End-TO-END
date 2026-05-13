import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string().min(3).max(30).trim(),
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(6).max(100),
  publicKey: z.string().optional(),
  phoneNumber: z.string().max(20).optional(),
});

export const loginSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
