const webpush = require('web-push');
const env = require('../config/env');

let vapidApplied = false;

// Indique si les clés VAPID nécessaires au Web Push sont renseignées.
const isConfigured = () => Boolean(env.push.publicKey && env.push.privateKey && env.push.subject);

// Envoie un message chiffré à un appareil abonné.
const send = (subscription, payload) => {
  if (!vapidApplied) {
    webpush.setVapidDetails(env.push.subject, env.push.publicKey, env.push.privateKey);
    vapidApplied = true;
  }
  return webpush.sendNotification(
    { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
    JSON.stringify(payload),
    { TTL: 24 * 60 * 60, urgency: 'high' },
  );
};

// Indique qu'un abonnement n'existe plus chez le service de push et doit être oublié.
const isExpiredSubscription = (error) => error?.statusCode === 404 || error?.statusCode === 410;

module.exports = { isConfigured, send, isExpiredSubscription };
