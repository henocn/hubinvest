const env = require('../../config/env');
const roles = require('../../shared/roles');
const templates = require('./notification.templates');
const notificationRepository = require('./notification.repository');
const notificationWorker = require('./notification.worker');

// Exécute l'ajout des notifications hors du parcours de la requête : une erreur ne bloque jamais l'action métier.
const dispatch = (task) => {
  if (!env.notifications.enabled) return;
  Promise.resolve()
    .then(task)
    .then(() => notificationWorker.wake())
    .catch((error) => console.error('Notification non planifiée.', error.message));
};

// Prépare une notification par compte, envoyée en push ou à défaut par e-mail.
const forUsers = (users, render, extra = {}) => {
  const unique = [...new Map(users.map((user) => [user.id, user])).values()];
  return unique.map((user) => ({
    channel: 'user',
    recipient: user.id,
    payload: render(user),
    ...extra,
  }));
};

// Retrouve les administrateurs d'un stand, ou les super administrateurs si le stand n'en a pas.
const standTeam = async (occupantId) => {
  const admins = occupantId ? await notificationRepository.findStandUsers(occupantId, [roles.ADMIN]) : [];
  return admins.length > 0 ? admins : notificationRepository.findSuperAdmins();
};

// Prévient les occupants d'un stand qu'un visiteur demande à être recontacté.
const contactRequested = (occupant) => dispatch(async () => {
  const users = await notificationRepository.findStandUsers(occupant.id, [roles.OCCUPANT]);
  if (users.length === 0) return;
  await notificationRepository.enqueue(forUsers(users, (user) => templates.contactRequested({ user, occupant })));
});

// Planifie, remplace ou annule le rappel de la prochaine action d'un contact.
const contactReminderChanged = (contact) => dispatch(async () => {
  const dedupeKey = `contact-reminder:${contact.id}`;
  await notificationRepository.cancelPending(dedupeKey);
  const dueAt = contact.nextActionAt ? new Date(contact.nextActionAt) : null;
  if (!dueAt || Number.isNaN(dueAt.getTime()) || dueAt <= new Date()) return;

  const creator = contact.createdByUserId ? await notificationRepository.findActiveUser(contact.createdByUserId) : null;
  const users = creator ? [creator] : await notificationRepository.findStandUsers(contact.occupantId, [roles.OCCUPANT]);
  if (users.length === 0) return;
  await notificationRepository.enqueue(forUsers(
    users,
    (user) => ({ ...templates.contactReminder({ user, contact }), tag: dedupeKey }),
    { dedupeKey, availableAt: dueAt },
  ));
});

// Prévient l'équipe de l'API-ZF (super administrateurs) et confirme à l'investisseur la réception de sa demande.
const investorRequestReceived = (request) => dispatch(async () => {
  const team = await notificationRepository.findSuperAdmins();
  await notificationRepository.enqueue([
    ...forUsers(team, (user) => templates.investorRequestReceived({ user })),
    { channel: 'email', recipient: request.email, payload: templates.investorRequestConfirmation({ request }) },
  ]);
});

// Prévient l'équipe du stand et confirme au professionnel l'envoi de sa proposition.
const b2bProposalReceived = (proposal, need) => dispatch(async () => {
  const { occupant } = need;
  const team = await standTeam(occupant.id);
  await notificationRepository.enqueue([
    ...forUsers(team, (user) => templates.b2bProposalReceived({ user, need })),
    { channel: 'email', recipient: proposal.email, payload: templates.b2bProposalConfirmation({ proposal, need, occupant }) },
  ]);
});

// Informe le professionnel de l'acceptation ou du refus de sa proposition.
const b2bProposalDecided = (proposal, need) => dispatch(async () => {
  await notificationRepository.enqueue([
    { channel: 'email', recipient: proposal.email, payload: templates.b2bProposalDecision({ proposal, need, occupant: need.occupant }) },
  ]);
});

// Envoie au visiteur le rendez-vous B2B fixé, ou son annulation.
const b2bMeetingScheduled = (meeting, proposal) => dispatch(async () => {
  await notificationRepository.enqueue([
    { channel: 'email', recipient: proposal.email, payload: templates.b2bMeetingScheduled({ meeting, proposal, need: proposal.need, occupant: proposal.need.occupant }) },
  ]);
});

const b2bMeetingCancelled = (meeting, proposal) => dispatch(async () => {
  await notificationRepository.enqueue([
    { channel: 'email', recipient: proposal.email, payload: templates.b2bMeetingCancelled({ meeting, proposal, need: proposal.need, occupant: proposal.need.occupant }) },
  ]);
});

// Prévient l'auteur de l'invitation et l'équipe du stand de la réponse de l'invité.
const studioInvitationAnswered = (invitation) => dispatch(async () => {
  const creator = invitation.createdByUserId ? await notificationRepository.findActiveUser(invitation.createdByUserId) : null;
  const team = await standTeam(invitation.occupantId);
  await notificationRepository.enqueue(forUsers(
    [...(creator ? [creator] : []), ...team],
    (user) => templates.studioInvitationAnswered({ user, invitation }),
  ));
});

module.exports = {
  contactRequested,
  contactReminderChanged,
  investorRequestReceived,
  b2bProposalReceived,
  b2bProposalDecided,
  b2bMeetingScheduled,
  b2bMeetingCancelled,
  studioInvitationAnswered,
};
