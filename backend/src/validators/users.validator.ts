import { z } from 'zod';

export const searchUsersSchema = z.object({
  q: z.string().min(1).max(100).trim(),
});

export type SearchUsersInput = z.infer<typeof searchUsersSchema>;
