import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { conversationsService } from '../services/conversations.service';
import { messagesService } from '../services/messages.service';
import { authMiddleware } from '../middleware/auth';

export async function conversationsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authMiddleware);

  // Create or get direct conversation with a friend
  fastify.post(
    '/direct/:friendId',
    async (
      request: FastifyRequest<{ Params: { friendId: string } }>,
      reply: FastifyReply
    ) => {
      const conversation = await conversationsService.getOrCreateDirect(
        request.userId,
        request.params.friendId
      );
      return reply.send(conversation);
    }
  );

  // Get all conversations
  fastify.get(
    '/',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const conversations = await conversationsService.getUserConversations(
        request.userId
      );
      return reply.send(conversations);
    }
  );

  // Get a single conversation by ID
  fastify.get(
    '/:conversationId',
    async (
      request: FastifyRequest<{ Params: { conversationId: string } }>,
      reply: FastifyReply
    ) => {
      const conversation = await conversationsService.getConversationById(
        request.params.conversationId,
        request.userId
      );
      return reply.send(conversation);
    }
  );

  // Get messages for a conversation
  fastify.get(
    '/:conversationId/messages',
    async (
      request: FastifyRequest<{
        Params: { conversationId: string };
        Querystring: { page?: string; limit?: string };
      }>,
      reply: FastifyReply
    ) => {
      const page = parseInt((request.query as any).page || '1', 10);
      const limit = parseInt((request.query as any).limit || '50', 10);
      const messages = await messagesService.getConversationMessages(
        request.params.conversationId,
        request.userId,
        page,
        Math.min(limit, 100)
      );
      return reply.send(messages);
    }
  );
}
