const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool({ ...config.database, max: 5 });

const STALE_LOCK_MINUTES = 10;

// Réserve un lot de notifications prêtes pour les canaux de ce service, sans conflit avec l'API ni un autre
// exemplaire du service (FOR UPDATE SKIP LOCKED).
const claimBatch = async (limit, channels) => {
  const { rows } = await pool.query(
    `UPDATE notification_jobs
        SET status = 'processing', locked_at = NOW(), attempts = attempts + 1, updated_at = NOW()
      WHERE id IN (
        SELECT id FROM notification_jobs
         WHERE channel = ANY($2)
           AND ((status = 'pending' AND available_at <= NOW())
             OR (status = 'processing' AND locked_at < NOW() - INTERVAL '${STALE_LOCK_MINUTES} minutes'))
         ORDER BY available_at
         LIMIT $1
         FOR UPDATE SKIP LOCKED
      )
      RETURNING id, channel, recipient, payload, attempts`,
    [limit, channels],
  );
  return rows;
};

// « note » garde une trace sans échec : un WhatsApp remplacé par un e-mail, par exemple.
const markSent = (id, note = null) => pool.query(
  "UPDATE notification_jobs SET status = 'sent', sent_at = NOW(), locked_at = NULL, last_error = $2, updated_at = NOW() WHERE id = $1",
  [id, note ? String(note).slice(0, 500) : null],
);

const markRetry = (id, error, availableAt) => pool.query(
  "UPDATE notification_jobs SET status = 'pending', locked_at = NULL, available_at = $3, last_error = $2, updated_at = NOW() WHERE id = $1",
  [id, String(error).slice(0, 500), availableAt],
);

const markFailed = (id, error) => pool.query(
  "UPDATE notification_jobs SET status = 'failed', locked_at = NULL, last_error = $2, updated_at = NOW() WHERE id = $1",
  [id, String(error).slice(0, 500)],
);

const findActiveUser = async (id) => {
  const { rows } = await pool.query('SELECT id, email, first_name AS "firstName" FROM users WHERE id = $1 AND is_active = TRUE', [id]);
  return rows[0] || null;
};

const findSubscriptions = async (userId) => {
  const { rows } = await pool.query('SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1', [userId]);
  return rows;
};

const removeSubscription = (id) => pool.query('DELETE FROM push_subscriptions WHERE id = $1', [id]);

// Personnes différentes jointes par WhatsApp sur les dernières 24 h (une ligne sans note = vraiment envoyée par WhatsApp).
const whatsappRecipientsToday = async () => {
  const { rows } = await pool.query(
    `SELECT DISTINCT recipient FROM notification_jobs
      WHERE channel = 'whatsapp' AND status = 'sent' AND last_error IS NULL AND sent_at > NOW() - INTERVAL '24 hours'`,
  );
  return new Set(rows.map((row) => row.recipient));
};

const close = () => pool.end();

module.exports = { pool, claimBatch, markSent, markRetry, markFailed, findActiveUser, findSubscriptions, removeSubscription, whatsappRecipientsToday, close };
