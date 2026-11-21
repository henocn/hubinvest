const crypto = require('node:crypto');
const env = require('../../config/env');
const AppError = require('../../shared/app-error');
const roles = require('../../shared/roles');
const { findSessionUser } = require('../../middlewares/auth.middleware');
const hub = require('./realtime.hub');
const { User } = require('../../models');

// Jetons de flux à usage unique : EventSource ne sait pas envoyer l'en-tête Authorization.
const tickets = new Map();

const channels = Object.freeze({
  superAdmins: 'super-admin',
  admins: 'admins',
  animators: 'animateur',
  user: (id) => `user:${id}`,
  occupant: (occupantId) => `occupant:${occupantId}`,
  admin: (occupantId) => `admin:${occupantId}`,
  passport: (passportId) => `passport:${passportId}`,
});

// Liste les canaux qu'un compte a le droit d'écouter, avec le même cloisonnement que l'API.
const channelsFor = (user) => {
  const list = [channels.user(user.id)];
  if (user.role === roles.SUPER_ADMIN) list.push(channels.superAdmins);
  if (user.role === roles.ADMIN) list.push(channels.admins);
  if (user.role === roles.ADMIN && user.occupantId) list.push(channels.admin(user.occupantId));
  if (user.role === roles.OCCUPANT && user.occupantId) list.push(channels.occupant(user.occupantId));
  if (user.role === roles.ANIMATOR) list.push(channels.animators);
  return list;
};

// Oublie les jetons expirés.
const purgeTickets = (now = Date.now()) => {
  tickets.forEach((ticket, value) => { if (ticket.expiresAt <= now) tickets.delete(value); });
};

// Délivre un jeton court pour ouvrir le flux du compte connecté.
const issueTicket = (user, tokenExpiresAt = null) => {
  if (!env.realtime.enabled) throw new AppError(503, 'REALTIME_DISABLED', 'Le temps réel est désactivé.');
  purgeTickets();
  const value = crypto.randomBytes(24).toString('base64url');
  const expiresAt = Date.now() + env.realtime.ticketTtl;
  tickets.set(value, { userId: user.id, expiresAt, sessionExpiresAt: tokenExpiresAt });
  return { ticket: value, expiresAt: new Date(expiresAt).toISOString() };
};

// Consomme un jeton : il ne peut servir qu'une fois.
const consumeTicket = (value) => {
  const ticket = typeof value === 'string' ? tickets.get(value) : null;
  if (ticket) tickets.delete(value);
  if (!ticket || ticket.expiresAt <= Date.now()) {
    throw new AppError(401, 'REALTIME_TICKET_INVALID', 'Jeton de connexion en temps réel invalide ou expiré.');
  }
  return ticket;
};

// Refuse une nouvelle connexion quand le serveur ou la clé en ont déjà trop.
const assertCapacity = (key) => {
  if (hub.size() >= env.realtime.maxStreams) {
    throw new AppError(503, 'REALTIME_FULL', 'Trop de connexions en temps réel. Réessayez dans un instant.');
  }
  if (hub.countByKey(key) >= env.realtime.maxStreamsPerKey) {
    throw new AppError(429, 'REALTIME_TOO_MANY_STREAMS', 'Trop de connexions en temps réel ouvertes pour ce compte.');
  }
};

// Présence : un compte est « en ligne » tant qu'au moins un de ses écrans garde le flux ouvert.
const isOnline = (userId) => hub.countByKey(channels.user(userId)) > 0;

// Note l'heure de présence puis prévient l'administration ; une erreur ne coupe jamais le flux.
const touchPresence = (userId, announce) => User.update({ lastSeenAt: new Date() }, { where: { id: userId } })
  .catch((error) => console.error('Présence non enregistrée.', error.message))
  .then(() => { if (announce) events.usersChanged(); });

// Ouvre le flux d'un compte à partir de son jeton, sans dépasser la durée de sa session.
const openUserStream = async (request, response, ticketValue) => {
  if (!env.realtime.enabled) throw new AppError(503, 'REALTIME_DISABLED', 'Le temps réel est désactivé.');
  const ticket = consumeTicket(ticketValue);
  const user = await findSessionUser(ticket.userId);
  const key = `user:${user.id}`;
  assertCapacity(key);
  const untilSessionEnd = ticket.sessionExpiresAt ? ticket.sessionExpiresAt - Date.now() : Infinity;
  if (untilSessionEnd <= 0) throw new AppError(401, 'INVALID_TOKEN', 'Session invalide ou expirée.');
  const wasOnline = isOnline(user.id);
  const client = hub.open(request, response, {
    key,
    channels: channelsFor(user),
    maxDuration: Math.min(env.realtime.maxStreamDuration, untilSessionEnd),
    // Dernier écran fermé : le compte passe hors ligne.
    onClose: () => { void touchPresence(user.id, !isOnline(user.id)); },
  });
  void touchPresence(user.id, !wasOnline);
  return client;
};

// Ouvre le flux public d'un parcours Défis, identifié par son lien personnel.
const openPassportStream = (request, response, passport) => {
  if (!env.realtime.enabled) throw new AppError(503, 'REALTIME_DISABLED', 'Le temps réel est désactivé.');
  const key = `passport:${passport.id}`;
  assertCapacity(key);
  return hub.open(request, response, { key, channels: [channels.passport(passport.id)] });
};

// Publie sans jamais faire échouer l'action métier qui vient de réussir.
const safePublish = (targets, topic) => {
  try {
    return hub.publish(targets, topic);
  } catch (error) {
    console.error('Diffusion en temps réel impossible.', error.message);
    return 0;
  }
};

const unique = (values) => [...new Set((values || []).filter(Boolean))];

// Événements métier : ils indiquent seulement quel sujet recharger, jamais les données elles-mêmes.
const events = {
  // Carnet de contacts d'un stand, et compteurs globaux du super administrateur.
  contactsChanged: (occupantId) => safePublish([channels.occupant(occupantId), channels.superAdmins], 'contacts'),
  // Passage validé ou récompense remise : stands concernés, animateurs, backoffice et participant.
  challengeChanged: ({ passportId, occupantIds = [] }) => safePublish([
    ...unique(occupantIds).flatMap((occupantId) => [channels.occupant(occupantId), channels.admin(occupantId)]),
    channels.superAdmins,
    channels.animators,
    passportId && channels.passport(passportId),
  ], 'challenge'),
  investorRequestsChanged: () => safePublish([channels.superAdmins], 'investor-requests'),
  b2bChanged: (occupantIds) => safePublish([...unique([].concat(occupantIds)).map(channels.admin), channels.superAdmins], 'b2b'),
  studioChanged: (occupantIds) => safePublish([...unique([].concat(occupantIds)).map(channels.admin), channels.superAdmins], 'studio'),
  // Fiche de stand modifiée : backoffice et en-tête de l'espace occupant (logo, nom).
  occupantsChanged: (occupantId = null) => safePublish([
    channels.superAdmins,
    occupantId && channels.occupant(occupantId),
    occupantId && channels.admin(occupantId),
  ], 'occupants'),
  usersChanged: () => safePublish([channels.superAdmins], 'users'),
  // Compte modifié, désactivé ou supprimé : ses écrans revérifient leur session.
  accountChanged: (userId) => safePublish([channels.user(userId)], 'account'),
  programChanged: () => safePublish([channels.superAdmins], 'program'),
  servicesChanged: () => safePublish([channels.superAdmins], 'services'),
  // Roue des opportunités : cases, stock et codes, partagés par toute l'administration.
  wheelChanged: () => safePublish([channels.superAdmins, channels.admins], 'wheel'),
  // Modules ouverts ou fermés, nombre de stands des Défis : toute l'équipe.
  // Questions du public pendant un direct : animateurs et super administrateurs.
  liveQuestionsChanged: () => safePublish([channels.animators, channels.superAdmins], 'live-questions'),
  settingsChanged: () => safePublish([channels.superAdmins, channels.admins, channels.animators], 'settings'),
};

module.exports = {
  channels,
  channelsFor,
  issueTicket,
  consumeTicket,
  openUserStream,
  openPassportStream,
  isOnline,
  events,
  closeAll: hub.closeAll,
  _tickets: tickets,
};
