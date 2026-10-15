const env = require('../../config/env');
const mailer = require('../../shared/mailer');
const webPush = require('../../shared/web-push');
const notificationRepository = require('./notification.repository');
const pushSubscriptionRepository = require('../push-subscription/push-subscription.repository');

const RETRY_DELAYS = [60 * 1000, 5 * 60 * 1000, 15 * 60 * 1000, 60 * 60 * 1000, 3 * 60 * 60 * 1000];

let timer = null;
let running = null;
let wakeRequested = false;
let stopped = true;

// Envoie un e-mail en exigeant une configuration SMTP complète.
const sendEmail = async (to, { subject, text }) => {
  if (!mailer.isConfigured()) throw new Error('SMTP non configuré.');
  await mailer.send({ to, subject, text });
};

// Notifie un compte par push sur ses appareils, ou par e-mail s'il n'en a aucun de joignable.
const deliverToUser = async (userId, payload) => {
  const user = await notificationRepository.findActiveUser(userId);
  if (!user) return;

  let delivered = 0;
  if (webPush.isConfigured()) {
    const subscriptions = await pushSubscriptionRepository.findByUser(userId);
    const message = { title: payload.title, body: payload.body, url: payload.url, tag: payload.tag };
    await Promise.all(subscriptions.map(async (subscription) => {
      try {
        await webPush.send(subscription, message);
        delivered += 1;
      } catch (error) {
        if (webPush.isExpiredSubscription(error)) await pushSubscriptionRepository.remove(subscription);
      }
    }));
  }

  if (delivered === 0 && payload.subject) await sendEmail(user.email, payload);
};

// Traite une notification réservée puis la marque envoyée, à réessayer ou abandonnée.
const processJob = async (job) => {
  try {
    if (job.channel === 'email') await sendEmail(job.recipient, job.payload);
    else await deliverToUser(job.recipient, job.payload);
    await notificationRepository.markSent(job.id);
  } catch (error) {
    const reason = error?.message || error;
    if (job.attempts >= env.notifications.maxAttempts) {
      await notificationRepository.markFailed(job.id, reason);
      console.error(`Notification ${job.id} abandonnée après ${job.attempts} tentatives : ${reason}`);
      return;
    }
    const delay = RETRY_DELAYS[Math.min(job.attempts - 1, RETRY_DELAYS.length - 1)];
    await notificationRepository.markRetry(job.id, reason, new Date(Date.now() + delay));
  }
};

// Vide la file par lots tant que des notifications sont prêtes.
const drain = async () => {
  do {
    wakeRequested = false;
    const jobs = await notificationRepository.claimBatch(env.notifications.batchSize);
    await Promise.all(jobs.map(processJob));
    if (jobs.length === env.notifications.batchSize) wakeRequested = true;
  } while (wakeRequested && !stopped);
};

// Lance un passage sur la file, sans jamais en exécuter deux en parallèle.
const tick = () => {
  if (running) {
    wakeRequested = true;
    return running;
  }
  running = drain()
    .catch((error) => console.error('Traitement des notifications impossible.', error.message))
    .finally(() => { running = null; });
  return running;
};

// Demande un traitement immédiat après l'ajout d'une notification.
const wake = () => {
  if (!stopped) setImmediate(tick);
};

// Démarre le traitement périodique des notifications.
const start = () => {
  if (!stopped) return;
  stopped = false;
  timer = setInterval(tick, env.notifications.pollInterval);
  tick();
};

// Arrête le traitement en laissant finir le lot en cours.
const stop = async () => {
  stopped = true;
  clearInterval(timer);
  timer = null;
  if (running) await running;
};

module.exports = { start, stop, wake, tick, processJob };
