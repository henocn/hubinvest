const config = require('./config');
const db = require('./db');
const email = require('./channels/email');
const push = require('./channels/push');
const whatsapp = require('./channels/whatsapp');

// Traitement de la file notification_jobs :
// - email : un e-mail ;
// - user : un compte de l'équipe, en push sur ses appareils, ou par e-mail s'il n'en a aucun de joignable ;
// - whatsapp : un modèle WhatsApp au visiteur ; si WhatsApp n'est pas possible (non configuré, plafond du jour atteint,
//   numéro sans WhatsApp, modèle refusé…), l'e-mail de repli prévu dans le message part à la place.
// Une erreur passagère est réessayée plus tard (1 min, 5 min, 15 min, 1 h, 3 h), au plus maxAttempts fois.

const RETRY_DELAYS = [60 * 1000, 5 * 60 * 1000, 15 * 60 * 1000, 60 * 60 * 1000, 3 * 60 * 60 * 1000];
const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

class PermanentError extends Error {}

const deliverToUser = async (userId, payload) => {
  const user = await db.findActiveUser(userId);
  if (!user) return 'Compte inactif ou supprimé : rien envoyé.';
  let delivered = 0;
  if (push.isConfigured()) {
    const subscriptions = await db.findSubscriptions(userId);
    const message = { title: payload.title, body: payload.body, url: payload.url, tag: payload.tag };
    await Promise.all(subscriptions.map(async (subscription) => {
      try {
        await push.send(subscription, message);
        delivered += 1;
      } catch (error) {
        if (push.isExpired(error)) await db.removeSubscription(subscription.id);
      }
    }));
  }
  if (delivered === 0 && payload.subject) await email.send(user.email, payload);
  return null;
};

// Débit WhatsApp : un envoi à la fois, espacés ; plafond de personnes différentes par 24 h.
let lastWhatsappAt = 0;
const throttleWhatsapp = async () => {
  const wait = lastWhatsappAt + 1000 / config.whatsapp.perSecond - Date.now();
  if (wait > 0) await sleep(wait);
  lastWhatsappAt = Date.now();
};

const fallbackToEmail = async (payload, reason) => {
  const fallback = payload.fallback;
  if (!fallback?.recipient) throw new PermanentError(`${reason} Aucun e-mail de repli.`);
  await email.send(fallback.recipient, fallback);
  return `Repli e-mail : ${reason}`;
};

const deliverWhatsapp = async (recipient, payload, recipientsToday) => {
  if (!whatsapp.isConfigured()) return fallbackToEmail(payload, 'WhatsApp non configuré.');
  const number = whatsapp.toWhatsappNumber(recipient);
  if (!recipientsToday.has(number) && recipientsToday.size >= config.whatsapp.dailyRecipients) {
    return fallbackToEmail(payload, 'plafond WhatsApp du jour atteint.');
  }
  await throttleWhatsapp();
  try {
    await whatsapp.send(number, payload);
    recipientsToday.add(number);
    return null;
  } catch (error) {
    if (error.retryable) throw error;
    return fallbackToEmail(payload, error.message);
  }
};

const processJob = async (job, context) => {
  try {
    let note = null;
    if (job.channel === 'email') await email.send(job.recipient, job.payload);
    else if (job.channel === 'user') note = await deliverToUser(job.recipient, job.payload);
    else if (job.channel === 'whatsapp') note = await deliverWhatsapp(job.recipient, job.payload, context.recipientsToday);
    else throw new PermanentError(`Canal inconnu : ${job.channel}`);
    await db.markSent(job.id, note);
  } catch (error) {
    const reason = error?.message || String(error);
    if (error instanceof PermanentError || job.attempts >= config.queue.maxAttempts) {
      await db.markFailed(job.id, reason);
      console.error(`Notification ${job.id} (${job.channel}) abandonnée : ${reason}`);
      return;
    }
    const delay = RETRY_DELAYS[Math.min(job.attempts - 1, RETRY_DELAYS.length - 1)];
    await db.markRetry(job.id, reason, new Date(Date.now() + delay));
  }
};

// Vide la file par lots. Les WhatsApp passent un par un (débit) ; e-mails et push en parallèle.
const drain = async () => {
  for (;;) {
    const jobs = await db.claimBatch(config.queue.batchSize, config.queue.channels);
    if (!jobs.length) return;
    const context = { recipientsToday: jobs.some((job) => job.channel === 'whatsapp') ? await db.whatsappRecipientsToday() : new Set() };
    const whatsappJobs = jobs.filter((job) => job.channel === 'whatsapp');
    await Promise.all(jobs.filter((job) => job.channel !== 'whatsapp').map((job) => processJob(job, context)));
    for (const job of whatsappJobs) await processJob(job, context); // eslint-disable-line no-await-in-loop
    if (jobs.length < config.queue.batchSize) return;
  }
};

let stopped = false;
let running = null;

const start = async () => {
  console.log(`Notifier HubInvest : canaux ${config.queue.channels.join(', ')} ; e-mail ${email.isConfigured() ? 'prêt' : 'non configuré'}, push ${push.isConfigured() ? 'prêt' : 'non configuré'}, WhatsApp ${whatsapp.isConfigured() ? 'prêt' : 'non configuré (repli e-mail)'}.`);
  while (!stopped) {
    running = drain().catch((error) => console.error('Traitement des notifications impossible.', error.message));
    await running; // eslint-disable-line no-await-in-loop
    running = null;
    if (!stopped) await sleep(config.queue.pollInterval); // eslint-disable-line no-await-in-loop
  }
};

const stop = async () => {
  stopped = true;
  if (running) await running;
};

module.exports = { start, stop, processJob, drain, PermanentError };
