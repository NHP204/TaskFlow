import path from 'node:path';
import dotenv from 'dotenv';

const nodeEnv = process.env.NODE_ENV || 'development';

// .env.test for the test suite, .env otherwise. Real environment variables
// (e.g. set by CI or the container) always win over the file.
dotenv.config({
  path: path.resolve(import.meta.dirname, '../..', nodeEnv === 'test' ? '.env.test' : '.env'),
  quiet: true,
});

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const env = Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: Number(process.env.PORT) || 3000,
  databaseUrl: required('DATABASE_URL'),
  corsOrigins: (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
});

export default env;
