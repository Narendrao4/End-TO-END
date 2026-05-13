import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import { env } from './config/env';
import { authRoutes } from './routes/auth.routes';
import { usersRoutes } from './routes/users.routes';
import { friendsRoutes } from './routes/friends.routes';
import { conversationsRoutes } from './routes/conversations.routes';
import { messagesRoutes } from './routes/messages.routes';
import { inviteRoutes } from './routes/invite.routes';
import { AppError } from './utils/errors';

export async function buildApp() {
  const app = Fastify({
    logger: env.NODE_ENV === 'development',
    trustProxy: true, // needed for correct request.ip behind proxy
  });

  // Plugins
  await app.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (mobile apps, curl, etc)
      if (!origin) return cb(null, true);
      // Allow configured origins
      if (env.CORS_ORIGINS.includes(origin)) return cb(null, true);
      // Allow localhost/10.0.2.2 in development
      if (env.NODE_ENV === 'development' && (origin.includes('localhost') || origin.includes('10.0.2.2') || origin.includes('127.0.0.1') || origin.includes('192.168.'))) return cb(null, true);
      cb(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  await app.register(cookie, {
    secret: env.JWT_ACCESS_SECRET, // cookie signing secret
  });

  // Error handler
  app.setErrorHandler((error: Error & { validation?: unknown; statusCode?: number }, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.message,
        statusCode: error.statusCode,
      });
    }

    // Zod validation or other errors
    if (error.validation) {
      return reply.status(400).send({
        error: 'Validation error',
        details: error.validation,
      });
    }

    console.error('Unhandled error:', error);
    return reply.status(500).send({
      error: 'Internal server error',
      statusCode: 500,
    });
  });

  // Health check
  app.get('/api/health', async () => ({ status: 'ok' }));

  // Routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(usersRoutes, { prefix: '/api/users' });
  await app.register(friendsRoutes, { prefix: '/api/friends' });
  await app.register(conversationsRoutes, { prefix: '/api/conversations' });
  await app.register(messagesRoutes, { prefix: '/api/messages' });
  await app.register(inviteRoutes, { prefix: '/api/invite' });

  return app;
}
