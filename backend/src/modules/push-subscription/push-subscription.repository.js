const { PushSubscription } = require('../../models');

// Liste les appareils abonnés d'un utilisateur.
const findByUser = (userId) => PushSubscription.findAll({ where: { userId } });

// Rattache l'appareil à l'utilisateur connecté, même s'il servait à un autre compte.
const save = async ({ userId, endpoint, p256dh, auth }) => {
  const existing = await PushSubscription.findOne({ where: { endpoint } });
  if (existing) return existing.update({ userId, p256dh, auth });
  return PushSubscription.create({ userId, endpoint, p256dh, auth });
};

// Retire l'abonnement d'un appareil pour un utilisateur donné.
const removeForUser = (userId, endpoint) => PushSubscription.destroy({ where: { userId, endpoint } });

// Retire un abonnement expiré chez le service de push.
const remove = (subscription) => subscription.destroy();

module.exports = { findByUser, save, removeForUser, remove };
