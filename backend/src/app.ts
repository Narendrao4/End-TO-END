import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import { env, isAllowedOrigin } from './config/env';
import { connectDB, getDbStatus, isDbConnected } from './config/db';
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
      cb(null, isAllowedOrigin(origin));
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

  app.addHook('preHandler', async (request, reply) => {
    const pathname = request.url.split('?')[0];
    const isApiRequest = pathname.startsWith('/api/') || pathname.startsWith('/backend/api/');
    const isHealthCheck = pathname === '/api/health' || pathname === '/backend/api/health';

    if (!isApiRequest || isHealthCheck || request.method === 'OPTIONS') return;
    if (isDbConnected()) return;

    return reply.status(503).send({
      error: 'Database is not connected. Set MONGODB_URI in Vercel Environment Variables and redeploy.',
      statusCode: 503,
      database: getDbStatus(),
    });
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

    const errorName = (error as { name?: string }).name || '';
    const errorMessage = error.message || '';
    if (
      errorName.includes('Mongo') ||
      errorName.includes('Mongoose') ||
      errorMessage.includes('buffering timed out') ||
      errorMessage.includes('ECONNREFUSED')
    ) {
      console.error('Database error:', error);
      return reply.status(503).send({
        error: 'Database is not reachable. Check MONGODB_URI in Vercel Environment Variables and redeploy.',
        statusCode: 503,
        database: getDbStatus(),
      });
    }

    console.error('Unhandled error:', error);
    return reply.status(500).send({
      error: 'Internal server error',
      statusCode: 500,
    });
  });

  async function registerApiRoutes(basePrefix: string) {
    app.get(`${basePrefix}/health`, async () => ({
      status: isDbConnected() ? 'ok' : 'degraded',
      database: getDbStatus(),
    }));
    await app.register(authRoutes, { prefix: `${basePrefix}/auth` });
    await app.register(usersRoutes, { prefix: `${basePrefix}/users` });
    await app.register(friendsRoutes, { prefix: `${basePrefix}/friends` });
    await app.register(conversationsRoutes, { prefix: `${basePrefix}/conversations` });
    await app.register(messagesRoutes, { prefix: `${basePrefix}/messages` });
    await app.register(inviteRoutes, { prefix: `${basePrefix}/invite` });
  }

  await registerApiRoutes('/api');
  await registerApiRoutes('/backend/api');

  return app;
}

// Default export for Vercel: initializes DB + builds Fastify server
const appPromise = (async () => {
  await connectDB().catch((err) => console.error('DB connection failed:', err));
  return buildApp();
})();

export default appPromise;
