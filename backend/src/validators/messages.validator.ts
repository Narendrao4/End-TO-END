import { z } from 'zod';

export const sendMessageSchema = z.object({
  conversationId: z.string().min(1),
  receiverId: z.string().min(1),
  encryptedPayload: z.string().min(1),
  nonce: z.string().min(1),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
