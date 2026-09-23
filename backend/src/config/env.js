const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env'), quiet: true });

const integer = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const list = (value) =>
  value
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

const duration = (value, fallback) => {
  const match = String(value || '').trim().match(/^(\d+)(ms|s|m|h|d)?$/i);
  if (!match) return fallback;
  const units = { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return Number.parseInt(match[1], 10) * units[(match[2] || 'ms').toLowerCase()];
};

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: integer(process.env.PORT, 3000),
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: integer(process.env.DB_PORT, 5432),
    name: process.env.DB_NAME || 'hubinvest',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    dialect: process.env.DB_DIALECT || 'postgres',
  },
  auth: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    passwordResetExpiresIn: duration(process.env.PASSWORD_RESET_EXPIRES_IN, 30 * 60 * 1000),
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: integer(process.env.SMTP_PORT, 587),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    secure: process.env.SMTP_SECURE === 'true',
    fromName: process.env.SMTP_FROM_NAME || 'HubInvest',
    fromEmail: process.env.SMTP_FROM_EMAIL || '',
  },
  corsOrigins: list(process.env.CORS_ORIGINS),
  challenge: {
    requiredPassages: integer(process.env.CHALLENGE_REQUIRED_PASSAGES, 3),
  },
  translation: {
    deeplAuthKey: process.env.DEEPL_AUTH_KEY || '',
  },
};
