import { buildApp } from './app';
import { connectDB } from './config/db';
import { setupSocketIO } from './socket';
import { env } from './config/env';

async function start() {
  await connectDB();

  const app = await buildApp();

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  console.log(`Server running on port ${env.PORT}`);

  // Attach Socket.IO to the Fastify underlying server
  const io = setupSocketIO(app.server);

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down...');
    io.close();
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
