const path = require('path');
const dotenv = require('dotenv');

// Le service partage la configuration de l'API (base, SMTP, VAPID) : il lit backend/.env, puis un éventuel
// notifier/.env qui ne contient que ce qui lui est propre (WhatsApp).
dotenv.config({ path: process.env.NOTIFIER_ENV_FILE || path.resolve(__dirname, '..', '..', 'backend', '.env'), quiet: true });
dotenv.config({ path: path.resolve(__dirname, '..', '.env'), override: true, quiet: true });

const integer = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

module.exports = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: integer(process.env.DB_PORT, 5432),
    database: process.env.DB_NAME || 'hubinvest',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined,
  },
  queue: {
    pollInterval: integer(process.env.NOTIFIER_POLL_INTERVAL_MS, 10000),
    batchSize: integer(process.env.NOTIFICATIONS_BATCH_SIZE, 20),
    maxAttempts: integer(process.env.NOTIFICATIONS_MAX_ATTEMPTS, 5),
    // Canaux traités par ce service (par défaut tous) ; l'API, elle, ne traite jamais WhatsApp.
    channels: (process.env.NOTIFIER_CHANNELS || 'email,user,whatsapp').split(',').map((item) => item.trim()).filter(Boolean),
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
  push: {
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
    subject: process.env.VAPID_SUBJECT || (process.env.SMTP_FROM_EMAIL ? `mailto:${process.env.SMTP_FROM_EMAIL}` : ''),
  },
  whatsapp: {
    token: process.env.WHATSAPP_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',
    // Compte Meta non vérifié : 250 personnes différentes par 24 h. Au-delà, l'e-mail prend le relais.
    dailyRecipients: integer(process.env.WHATSAPP_DAILY_RECIPIENTS, 250),
    // Débit prudent pour rester loin des limites de Meta.
    perSecond: Math.max(1, integer(process.env.WHATSAPP_PER_SECOND, 5)),
  },
};
