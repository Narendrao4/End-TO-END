import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authService } from '../services/auth.service';
import { authMiddleware } from '../middleware/auth';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
} from '../validators/auth.validator';
import { AppError } from '../utils/errors';

export async function authRoutes(fastify: FastifyInstance) {
  // ─── Stricter rate limit on auth endpoints ───
  const authRateLimit = {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '5 minutes',
      },
    },
  };

  fastify.post(
    '/register',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = registerSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid input' });
      }
      const result = await authService.register(parsed.data);

      // Set refresh token as HttpOnly cookie
      reply.setCookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/auth',
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });

      return reply.status(201).send(result);
    }
  );

  fastify.post(
    '/login',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid input' });
      }

      const ip = request.ip || request.headers['x-forwarded-for'] as string || 'unknown';
      const userAgent = request.headers['user-agent'] || 'unknown';

      const result = await authService.login(parsed.data, ip, userAgent);

      // Set refresh token as HttpOnly cookie
      reply.setCookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/auth',
        maxAge: 7 * 24 * 60 * 60,
      });

      return reply.send(result);
    }
  );

  // ─── MFA VERIFY (after login, if mfaEnabled) ───
  fastify.post(
    '/mfa/verify',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { code } = request.body as { code: string };
      if (!code) return reply.status(400).send({ error: 'MFA code is required' });
      const result = await authService.verifyMfa(request.userId, code);
      return reply.send(result);
    }
  );

  // ─── MFA SETUP ───
  fastify.post(
    '/mfa/setup',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const result = await authService.setupMfa(request.userId);
      return reply.send(result);
    }
  );

  fastify.post(
    '/mfa/enable',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { code } = request.body as { code: string };
      if (!code) return reply.status(400).send({ error: 'MFA code is required' });
      const result = await authService.enableMfa(request.userId, code);
      return reply.send(result);
    }
  );

  fastify.post(
    '/mfa/disable',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { password } = request.body as { password: string };
      if (!password) return reply.status(400).send({ error: 'Password is required' });
      const result = await authService.disableMfa(request.userId, password);
      return reply.send(result);
    }
  );

  // ─── EMAIL VERIFICATION ───
  fastify.post(
    '/verify-email',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { token } = request.body as { token: string };
      if (!token) return reply.status(400).send({ error: 'Token is required' });
      const result = await authService.verifyEmail(token);
      return reply.send(result);
    }
  );

  fastify.post(
    '/resend-verification',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const result = await authService.resendVerification(request.userId);
      return reply.send({ message: 'Verification email sent' });
    }
  );

  // ─── PASSWORD RESET ───
  fastify.post(
    '/forgot-password',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { email } = request.body as { email: string };
      if (!email) return reply.status(400).send({ error: 'Email is required' });
      const result = await authService.requestPasswordReset(email);
      return reply.send(result);
    }
  );

  fastify.post(
    '/reset-password',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { token, password } = request.body as { token: string; password: string };
      if (!token || !password) {
        return reply.status(400).send({ error: 'Token and password are required' });
      }
      if (password.length < 6) {
        return reply.status(400).send({ error: 'Password must be at least 6 characters' });
      }
      const result = await authService.resetPassword(token, password);
      return reply.send(result);
    }
  );

  // ─── TOKEN REFRESH ───
  fastify.post(
    '/refresh',
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Accept refresh token from body OR HttpOnly cookie
      const body = request.body as { refreshToken?: string } | null;
      const tokenFromBody = body?.refreshToken;
      const tokenFromCookie = (request.cookies as any)?.refreshToken;
      const refreshTokenStr = tokenFromBody || tokenFromCookie;

      if (!refreshTokenStr) {
        return reply.status(400).send({ error: 'Refresh token is required' });
      }

      const result = await authService.refresh(refreshTokenStr);

      // Rotate the cookie too
      reply.setCookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/auth',
        maxAge: 7 * 24 * 60 * 60,
      });

      return reply.send(result);
    }
  );

  // ─── LOGOUT ───
  fastify.post(
    '/logout',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as { refreshToken?: string } | null;
      const tokenFromBody = body?.refreshToken;
      const tokenFromCookie = (request.cookies as any)?.refreshToken;
      const refreshTokenStr = tokenFromBody || tokenFromCookie;
      if (refreshTokenStr) {
        await authService.logout(refreshTokenStr);
      }

      // Clear cookie
      reply.clearCookie('refreshToken', { path: '/api/auth' });
      return reply.send({ message: 'Logged out' });
    }
  );

  // ─── LOGOUT ALL SESSIONS ───
  fastify.post(
    '/logout-all',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      await authService.logoutAll(request.userId);
      reply.clearCookie('refreshToken', { path: '/api/auth' });
      return reply.send({ message: 'All sessions invalidated' });
    }
  );

  // ─── GET ME ───
  fastify.get(
    '/me',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = await authService.getMe(request.userId);
      return reply.send(user);
    }
  );

  // ─── UPDATE PROFILE ───
  fastify.patch(
    '/me',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as { publicKey?: string; avatar?: string; bio?: string; phoneNumber?: string };
      const user = await authService.updateProfile(request.userId, body);
      return reply.send(user);
    }
  );

  // ─── LOGIN HISTORY ───
  fastify.get(
    '/login-history',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const history = await authService.getLoginHistory(request.userId);
      return reply.send(history);
    }
  );
}
