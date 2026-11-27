const crypto = require('node:crypto');
const env = require('../config/env');

// Signatures des QR imprimés (un par stand, un pour le comptoir des récompenses) et des tickets de questions.
// Elles prouvent que le lien vient de l'affiche, pas d'une adresse devinée : sans la signature, pas de validation.
const secret = () => `${env.auth.secret || 'hubinvest'}:passage`;

const sign = (kind, value, length = 12) => crypto
  .createHmac('sha256', secret())
  .update(`${kind}:${value}`)
  .digest('base64url')
  .slice(0, length);

const same = (expected, received) => {
  const a = Buffer.from(String(expected));
  const b = Buffer.from(String(received || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const verify = (kind, value, signature, length = 12) => same(sign(kind, value, length), signature);

// Ticket signé : son contenu (joueur, stand, bonnes réponses, échéance) reste côté joueur sans pouvoir être modifié.
const sealTicket = (payload) => {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign('ticket', body, 32)}`;
};

const openTicket = (ticket) => {
  const [body, signature] = String(ticket || '').split('.');
  if (!body || !verify('ticket', body, signature, 32)) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
};

// Le comptoir des récompenses du Stand API-ZF a son propre QR.
const DESK = ['desk', 'apizf'];
const deskSignature = () => sign(...DESK);
const verifyDesk = (signature) => verify(...DESK, signature);

module.exports = { sign, verify, sealTicket, openTicket, deskSignature, verifyDesk };
