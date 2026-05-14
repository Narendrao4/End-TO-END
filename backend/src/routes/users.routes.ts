import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { usersService } from '../services/users.service';
import { authMiddleware } from '../middleware/auth';
import { searchUsersSchema } from '../validators/users.validator';
import { registerPushToken, clearPushToken } from '../services/push.service';

export async function usersRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get(
    '/search',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = searchUsersSchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }
      const users = await usersService.search(parsed.data.q, request.userId);
      return reply.send(users);
    }
  );

  fastify.get(
    '/profile/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const user = await usersService.getProfile(request.params.id);
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }
      return reply.send(user);
    }
  );

  // Register Expo push token for notifications
  fastify.post(
    '/push-token',
    async (
      request: FastifyRequest<{ Body: { token: string } }>,
      reply: FastifyReply
    ) => {
      const { token } = request.body || {};
      if (!token || typeof token !== 'string') {
        return reply.status(400).send({ error: 'Push token is required' });
      }
      await registerPushToken(request.userId, token);
      return reply.send({ success: true });
    }
  );

  // Clear push token (on logout)
  fastify.delete(
    '/push-token',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await clearPushToken(request.userId);
      return reply.send({ success: true });
    }
  );

  // Get online status for a list of user IDs
  fastify.post(
    '/online-status',
    async (
      request: FastifyRequest<{ Body: { userIds: string[] } }>,
      reply: FastifyReply
    ) => {
      const { userIds } = request.body || {};
      if (!Array.isArray(userIds)) {
        return reply.status(400).send({ error: 'userIds array is required' });
      }
      // Check socket-based online status first
      const { isUserOnline } = await import('../socket');
      const onlineMap: Record<string, boolean> = {};
      for (const id of userIds) {
        onlineMap[id] = isUserOnline(id);
      }
      // Fallback: check lastSeen within 2 minutes for users not tracked by socket
      const User = (await import('../models')).User;
      const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000);
      const recentUsers = await User.find({
        _id: { $in: userIds.filter((id) => !onlineMap[id]) },
        lastSeen: { $gte: twoMinAgo },
      })
        .select('_id')
        .lean();
      for (const u of recentUsers) {
        onlineMap[String(u._id)] = true;
      }
      return reply.send({ online: onlineMap });
    }
  );

  // Update lastSeen (heartbeat)
  fastify.post(
    '/heartbeat',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const User = (await import('../models')).User;
      await User.findByIdAndUpdate(request.userId, { lastSeen: new Date() });
      return reply.send({ success: true });
    }
  );
}
