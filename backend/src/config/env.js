import path from 'node:path';
import dotenv from 'dotenv';

const nodeEnv = process.env.NODE_ENV || 'development';

// Loads .env.test when NODE_ENV=test, otherwise .env.
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
  jwt: {
    secret: required('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS) || 10,
  corsOrigins: (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
});

export default env;
