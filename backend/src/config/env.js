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
  },
  corsOrigins: list(process.env.CORS_ORIGINS),
  challenge: {
    requiredPassages: integer(process.env.CHALLENGE_REQUIRED_PASSAGES, 3),
  },
};
