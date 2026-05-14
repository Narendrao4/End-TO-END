import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { messagesService } from '../services/messages.service';
import { authMiddleware } from '../middleware/auth';
import { sendMessageSchema } from '../validators/messages.validator';
import { getIO } from '../socket';

export async function messagesRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authMiddleware);

  // Send a message
  fastify.post(
    '/',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = sendMessageSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }
      const message = await messagesService.sendMessage(
        request.userId,
        parsed.data
      );

      const realtimeMessage = {
        _id: message._id.toString(),
        conversationId: message.conversationId.toString(),
        senderId: message.senderId.toString(),
        receiverId: message.receiverId.toString(),
        senderPublicKey: message.senderPublicKey || '',
        encryptedPayload: message.encryptedPayload,
        nonce: message.nonce,
        messageType: message.messageType,
        status: message.status,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
      };

      // Don't emit here - sender's socket relay already sent it for instant delivery
      // Backend emit would create duplicates

      return reply.status(201).send(realtimeMessage);
    }
  );

  // Mark message as delivered
  fastify.patch(
    '/:messageId/delivered',
    async (
      request: FastifyRequest<{ Params: { messageId: string } }>,
      reply: FastifyReply
    ) => {
      const message = await messagesService.markDelivered(
        request.params.messageId,
        request.userId
      );
      return reply.send(message);
    }
  );

  // Mark message as read
  fastify.patch(
    '/:messageId/read',
    async (
      request: FastifyRequest<{ Params: { messageId: string } }>,
      reply: FastifyReply
    ) => {
      const message = await messagesService.markRead(
        request.params.messageId,
        request.userId
      );
      return reply.send(message);
    }
  );

  // Bulk mark all messages in a conversation as delivered
  fastify.patch(
    '/conversation/:conversationId/delivered',
    async (
      request: FastifyRequest<{ Params: { conversationId: string } }>,
      reply: FastifyReply
    ) => {
      const count = await messagesService.markConversationDelivered(
        request.params.conversationId,
        request.userId
      );
      return reply.send({ updated: count });
    }
  );

  // Bulk mark all messages in a conversation as read
  fastify.patch(
    '/conversation/:conversationId/read',
    async (
      request: FastifyRequest<{ Params: { conversationId: string } }>,
      reply: FastifyReply
    ) => {
      const count = await messagesService.markConversationRead(
        request.params.conversationId,
        request.userId
      );
      return reply.send({ updated: count });
    }
  );
}
