import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { friendsService } from '../services/friends.service';
import { authMiddleware } from '../middleware/auth';

export async function friendsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authMiddleware);

  // Send friend request
  fastify.post(
    '/request/:userId',
    async (
      request: FastifyRequest<{ Params: { userId: string } }>,
      reply: FastifyReply
    ) => {
      const result = await friendsService.sendRequest(
        request.userId,
        request.params.userId
      );
      return reply.status(201).send(result);
    }
  );

  // Accept friend request
  fastify.post(
    '/request/:requestId/accept',
    async (
      request: FastifyRequest<{ Params: { requestId: string } }>,
      reply: FastifyReply
    ) => {
      const result = await friendsService.acceptRequest(
        request.params.requestId,
        request.userId
      );
      return reply.send(result);
    }
  );

  // Reject friend request
  fastify.post(
    '/request/:requestId/reject',
    async (
      request: FastifyRequest<{ Params: { requestId: string } }>,
      reply: FastifyReply
    ) => {
      const result = await friendsService.rejectRequest(
        request.params.requestId,
        request.userId
      );
      return reply.send(result);
    }
  );

  // Cancel outgoing friend request
  fastify.delete(
    '/request/:requestId/cancel',
    async (
      request: FastifyRequest<{ Params: { requestId: string } }>,
      reply: FastifyReply
    ) => {
      const result = await friendsService.cancelRequest(
        request.params.requestId,
        request.userId
      );
      return reply.send(result);
    }
  );

  // Get incoming friend requests
  fastify.get(
    '/requests/incoming',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const requests = await friendsService.getIncomingRequests(request.userId);
      return reply.send(requests);
    }
  );

  // Get outgoing friend requests
  fastify.get(
    '/requests/outgoing',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const requests = await friendsService.getOutgoingRequests(request.userId);
      return reply.send(requests);
    }
  );

  // Get friends list
  fastify.get(
    '/list',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const friends = await friendsService.getFriendsList(request.userId);
      return reply.send(friends);
    }
  );
}
