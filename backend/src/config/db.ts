import mongoose from 'mongoose';
import { env } from './env';

export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export function getDbStatus(): string {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return states[mongoose.connection.readyState] || 'unknown';
}

export async function connectDB(): Promise<void> {
  if (isDbConnected()) {
    return;
  }

  if (!env.MONGODB_URI) {
    console.error('MongoDB connection skipped: MONGODB_URI is not configured.');
    return;
  }

  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    if (env.NODE_ENV !== 'production' && !env.IS_VERCEL) {
      process.exit(1);
    }
  }
}
