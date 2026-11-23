const { Op } = require('sequelize');
const { sequelize, NotificationJob, User } = require('../../models');
const { GLOBAL_ROLES } = require('../../shared/access');

const STALE_LOCK_MINUTES = 10;

// Ajoute des notifications à la file d'attente.
const enqueue = (jobs) => NotificationJob.bulkCreate(jobs);

// Annule les notifications encore en attente pour une même clé, avant leur remplacement.
const cancelPending = (dedupeKey) => NotificationJob.update(
  { status: 'cancelled' },
  { where: { dedupeKey, status: 'pending' } },
);

// Réserve un lot de notifications prêtes, sans conflit entre plusieurs processus.
const claimBatch = async (limit) => {
  const [rows] = await sequelize.query(
    `UPDATE notification_jobs
        SET status = 'processing', locked_at = NOW(), attempts = attempts + 1, updated_at = NOW()
      WHERE id IN (
        SELECT id FROM notification_jobs
         WHERE (status = 'pending' AND available_at <= NOW())
            OR (status = 'processing' AND locked_at < NOW() - INTERVAL '${STALE_LOCK_MINUTES} minutes')
         ORDER BY available_at
         LIMIT :limit
         FOR UPDATE SKIP LOCKED
      )
      RETURNING id, channel, recipient, payload, attempts`,
    { replacements: { limit } },
  );
  return rows;
};

// Marque une notification comme envoyée.
const markSent = (id) => NotificationJob.update(
  { status: 'sent', sentAt: new Date(), lockedAt: null, lastError: null },
  { where: { id } },
);

// Replace une notification en attente pour une nouvelle tentative.
const markRetry = (id, error, availableAt) => NotificationJob.update(
  { status: 'pending', lockedAt: null, availableAt, lastError: String(error).slice(0, 500) },
  { where: { id } },
);

// Abandonne une notification après le nombre maximal de tentatives.
const markFailed = (id, error) => NotificationJob.update(
  { status: 'failed', lockedAt: null, lastError: String(error).slice(0, 500) },
  { where: { id } },
);

// Liste les comptes actifs d'un stand pour les rôles demandés.
const findStandUsers = (occupantId, allowedRoles) => User.findAll({
  where: { occupantId, isActive: true, role: { [Op.in]: allowedRoles } },
  attributes: ['id', 'firstName', 'email'],
});

// Liste les super administrateurs actifs.
const findSuperAdmins = () => User.findAll({
  where: { role: { [Op.in]: GLOBAL_ROLES }, isActive: true },
  attributes: ['id', 'firstName', 'email'],
});

// Retrouve un compte actif par son identifiant.
const findActiveUser = (id) => User.findOne({
  where: { id, isActive: true },
  attributes: ['id', 'firstName', 'email'],
});

module.exports = {
  enqueue,
  cancelPending,
  claimBatch,
  markSent,
  markRetry,
  markFailed,
  findStandUsers,
  findSuperAdmins,
  findActiveUser,
};
