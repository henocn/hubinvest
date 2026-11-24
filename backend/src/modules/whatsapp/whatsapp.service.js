const crypto = require('crypto');
const env = require('../../config/env');
const { AUTO_REPLY } = require('./whatsapp.replies');

// Messages reçus sur le numéro WhatsApp de l'équipe (webhook Meta) : chaque personne qui écrit reçoit, une fois par jour,
// la réponse automatique (infos de l'événement, lien de l'application). Rien n'est enregistré en base.

// Vérification de l'adresse par Meta (GET) : renvoie le défi si le mot secret correspond.
const verify = ({ mode, token, challenge }) => (
  mode === 'subscribe' && env.whatsapp.verifyToken && token === env.whatsapp.verifyToken ? challenge : null
);

// Signature Meta (X-Hub-Signature-256) : contrôlée quand la clé secrète de l'application est configurée.
const validSignature = (rawBody, header) => {
  if (!env.whatsapp.appSecret) return true;
  if (!rawBody || !header?.startsWith('sha256=')) return false;
  const expected = Buffer.from(`sha256=${crypto.createHmac('sha256', env.whatsapp.appSecret).update(rawBody).digest('hex')}`);
  const received = Buffer.from(header);
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
};

// Une réponse par personne et par jour (heure de Lomé = UTC) ; la mémoire repart à zéro au redémarrage de l'API.
const repliedToday = new Map();
const alreadyReplied = (from) => {
  const today = new Date().toISOString().slice(0, 10);
  if (repliedToday.get(from) === today) return true;
  if (repliedToday.size > 5000) repliedToday.clear();
  repliedToday.set(from, today);
  return false;
};

// Messages texte, images, vocaux… reçus dans une notification Meta ; les accusés de lecture et statuts sont ignorés.
const incomingMessages = (body) => (body?.entry || []).flatMap((entry) => (entry.changes || [])
  .map((change) => change.value || {})
  .flatMap((value) => (value.messages || []).map((message) => ({ from: String(message.from || ''), phoneNumberId: String(value.metadata?.phone_number_id || '') }))))
  .filter((message) => message.from && message.phoneNumberId);

const sendText = async (phoneNumberId, to, text) => {
  const response = await fetch(`https://graph.facebook.com/${env.whatsapp.apiVersion}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.whatsapp.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text, preview_url: true } }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(`WhatsApp ${body.error?.code ?? response.status} : ${body.error?.message || 'envoi refusé'}`);
  }
};

// Traite une notification Meta déjà acceptée (la réponse HTTP 200 est partie) : jamais d'exception vers l'appelant.
const handleIncoming = async (body) => {
  if (!env.whatsapp.token) return;
  await Promise.all(incomingMessages(body).map(async ({ from, phoneNumberId }) => {
    if (alreadyReplied(from)) return;
    try {
      await sendText(phoneNumberId, from, AUTO_REPLY);
    } catch (error) {
      repliedToday.delete(from);
      console.error('Réponse WhatsApp automatique non envoyée.', error.message);
    }
  }));
};

module.exports = { verify, validSignature, incomingMessages, handleIncoming, _reset: () => repliedToday.clear() };
