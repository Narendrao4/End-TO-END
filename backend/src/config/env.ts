import dotenv from 'dotenv';
dotenv.config();

const configuredCorsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const vercelOrigin = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : null;

const corsOrigins = Array.from(
  new Set([
    ...configuredCorsOrigins,
    ...(vercelOrigin ? [vercelOrigin] : []),
  ])
);

const isVercel = process.env.VERCEL === '1' || Boolean(process.env.VERCEL_URL);
const isProduction = process.env.NODE_ENV === 'production' || isVercel;
const defaultMongoUri = isProduction ? '' : 'mongodb://localhost:27017/e2ee-chat';
const rawMongoUri = (process.env.MONGODB_URI || '').trim();
const productionLocalMongoUri =
  isProduction && /^mongodb:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(rawMongoUri);
const mongodbUri = productionLocalMongoUri ? '' : rawMongoUri || defaultMongoUri;

export const env = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  MONGODB_URI: mongodbUri,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',
  CORS_ORIGIN: corsOrigins[0] || 'http://localhost:3000',
  CORS_ORIGINS: corsOrigins,
  IS_VERCEL: isVercel,
  NODE_ENV: process.env.NODE_ENV || (isVercel ? 'production' : 'development'),
};

export function isAllowedOrigin(origin?: string): boolean {
  // Allow requests with no origin (mobile apps, curl, same-origin server calls).
  if (!origin) return true;
  if (env.CORS_ORIGINS.includes(origin)) return true;

  if (
    env.NODE_ENV === 'development' &&
    (origin.includes('localhost') ||
      origin.includes('10.0.2.2') ||
      origin.includes('127.0.0.1') ||
      origin.includes('192.168.'))
  ) {
    return true;
  }

  return false;
}
