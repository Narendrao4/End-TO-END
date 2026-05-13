import { buildApp } from '../src/app';
import { connectDB } from '../src/config/db';
import { setupSocketIO } from '../src/socket';

// Initialize app on module load
const initializeApp = async () => {
  // Connect to database
  await connectDB().catch((err) => {
    console.error('Database connection failed:', err);
  });

  // Build Fastify app
  const app = await buildApp();

  // Setup Socket.IO
  setupSocketIO(app.server);

  return app;
};

// Create and export the app as default
export default initializeApp();
