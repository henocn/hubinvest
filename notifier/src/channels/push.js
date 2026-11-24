const webpush = require('web-push');
const config = require('../config');

let ready = false;

const isConfigured = () => Boolean(config.push.publicKey && config.push.privateKey && config.push.subject);

// Message chiffré vers un appareil abonné (expire après 24 h s'il n'est pas remis).
const send = (subscription, payload) => {
  if (!ready) {
    webpush.setVapidDetails(config.push.subject, config.push.publicKey, config.push.privateKey);
    ready = true;
  }
  return webpush.sendNotification(
    { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
    JSON.stringify(payload),
    { TTL: 24 * 60 * 60, urgency: 'high' },
  );
};

// L'abonnement n'existe plus chez le service de push : on l'oublie.
const isExpired = (error) => error?.statusCode === 404 || error?.statusCode === 410;

module.exports = { isConfigured, send, isExpired };
