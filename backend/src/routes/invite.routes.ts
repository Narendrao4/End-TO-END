import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { inviteService } from '../services/invite.service';
import { sendSMS } from '../services/sms.service';
import { User } from '../models';
import { authMiddleware } from '../middleware/auth';

export async function inviteRoutes(fastify: FastifyInstance) {
  // Create invite link (auth required)
  fastify.post<{ Body: { expiresInHours?: number; maxUses?: number } }>(
    '/create',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const body = request.body || ({} as any);
      const link = await inviteService.createInviteLink(request.userId, {
        expiresInHours: body.expiresInHours,
        maxUses: body.maxUses,
      });
      return reply.status(201).send(link);
    }
  );

  // Quick create-and-return for direct sending (phone/email/share)
  fastify.post<{ Body: { target: string; method: 'sms' | 'whatsapp' | 'email'; origin?: string } }>(
    '/send-direct',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const body = request.body || ({} as any);
      const { target, method, origin } = body;
      if (!target || !method) {
        return reply.status(400).send({ error: 'target and method are required' });
      }
      // Create a single-use 7-day link
      const link = await inviteService.createInviteLink(request.userId, {
        expiresInHours: 168,
        maxUses: 1,
      });

      const sender = await User.findById(request.userId).select('username');
      const senderName = sender?.username || 'Someone';
      const inviteUrl = origin ? `${origin}/invite/${link.code}` : `/invite/${link.code}`;

      // For SMS method, actually send the SMS from the server
      if (method === 'sms') {
        const smsBody = `Hey! ${senderName} invited you to SecureChat for end-to-end encrypted messaging! Join here: ${inviteUrl}`;
        const result = await sendSMS(target, smsBody);
        if (result.success) {
          return reply.status(201).send({ link, target, method, smsSent: true, smsSid: result.sid });
        } else {
          // Still return the link even if SMS fails, so frontend can fallback
          return reply.status(201).send({ link, target, method, smsSent: false, smsError: result.error });
        }
      }

      return reply.status(201).send({ link, target, method });
    }
  );

  // Get my invite links (auth required)
  fastify.get(
    '/my-links',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const links = await inviteService.getMyInviteLinks(request.userId);
      return reply.send(links);
    }
  );

  // Get invite link info (public — so non-logged-in users can see who invited them)
  fastify.get<{ Params: { code: string } }>(
    '/info/:code',
    async (request, reply) => {
      const link = await inviteService.getInviteLinkInfo(request.params.code);
      return reply.send(link);
    }
  );

  // Accept invite link (auth required)
  fastify.post<{ Params: { code: string } }>(
    '/accept/:code',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const result = await inviteService.acceptInviteLink(
        request.params.code,
        request.userId
      );
      return reply.send(result);
    }
  );

  // Deactivate invite link (auth required)
  fastify.delete<{ Params: { linkId: string } }>(
    '/:linkId',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const result = await inviteService.deactivateLink(
        request.params.linkId,
        request.userId
      );
      return reply.send(result);
    }
  );
}
