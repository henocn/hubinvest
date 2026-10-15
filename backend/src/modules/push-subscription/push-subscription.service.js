const env = require('../../config/env');
const AppError = require('../../shared/app-error');
const webPush = require('../../shared/web-push');
const pushSubscriptionRepository = require('./push-subscription.repository');

// Donne la clé publique VAPID dont le navigateur a besoin pour s'abonner.
const publicKey = () => ({
  enabled: webPush.isConfigured(),
  publicKey: webPush.isConfigured() ? env.push.publicKey : null,
});

// Enregistre l'appareil courant pour recevoir les notifications du compte.
const subscribe = async (user, { endpoint, keys }) => {
  if (!webPush.isConfigured()) {
    throw new AppError(503, 'PUSH_NOT_CONFIGURED', 'Les notifications ne sont pas configurées.');
  }
  await pushSubscriptionRepository.save({ userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth });
  return { subscribed: true };
};

// Arrête les notifications sur l'appareil courant.
const unsubscribe = async (user, { endpoint }) => {
  await pushSubscriptionRepository.removeForUser(user.id, endpoint);
  return { subscribed: false };
};

module.exports = { publicKey, subscribe, unsubscribe };
