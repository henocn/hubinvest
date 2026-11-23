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

// Nouveau contact aux guichets : l'équipe de l'API-ZF (super administrateurs) est prévenue. Une demande de rappel
// n'envoie rien à la personne : l'équipe la rappelle (un rendez-vous réservé reçoit son propre e-mail, avec ses rappels).
const investorRequestReceived = (request) => dispatch(async () => {
  const team = await notificationRepository.findSuperAdmins();
  if (team.length) await notificationRepository.enqueue(forUsers(team, (user) => templates.investorRequestReceived({ user, request })));
});

// Relance des guichets : à son heure, le responsable du contact — ou, sans responsable, toute l'équipe API-ZF — est
// rappelé de relancer la personne, avec le motif. Chaque relance a son alerte ; la changer remplace l'alerte prévue.
const followUpKey = (followUp) => `investor-follow-up:${followUp.id}`;
const investorFollowUpChanged = (followUp, request) => dispatch(async () => {
  const dedupeKey = followUpKey(followUp);
  await notificationRepository.cancelPending(dedupeKey);
  const dueAt = new Date(followUp.dueAt);
  if (followUp.doneAt || Number.isNaN(dueAt.getTime()) || dueAt <= new Date()) return;
  const contact = request.contactUserId ? await notificationRepository.findActiveUser(request.contactUserId) : null;
  const users = contact ? [contact] : await notificationRepository.findSuperAdmins();
  if (users.length === 0) return;
  await notificationRepository.enqueue(forUsers(
    users,
    (user) => ({ ...templates.investorFollowUpDue({ user, request, followUp }), tag: dedupeKey }),
    { dedupeKey, availableAt: dueAt },
  ));
});

// Relance faite ou supprimée : son alerte disparaît.
const investorFollowUpRemoved = (followUp) => dispatch(() => notificationRepository.cancelPending(followUpKey(followUp)));

// Rendez-vous aux guichets fixé, déplacé ou annulé : la personne reçoit un e-mail, puis un rappel la veille et une heure
// avant ; un déplacement remplace les rappels, une annulation les retire.
const investorMeetingChanged = (kind, meeting, request) => dispatch(async () => {
  const dedupeKey = `investor-meeting-reminder:${meeting.id}`;
  await notificationRepository.cancelPending(dedupeKey);
  const email = (payload, extra = {}) => ({ channel: 'email', recipient: request.email, payload, ...extra });
  const start = new Date(meeting.startsAt).getTime();
  const reminders = kind === 'cancelled' ? [] : [start - 24 * 60 * 60 * 1000, start - 60 * 60 * 1000]
    .filter((time) => time > Date.now())
    .map((time) => email(templates.investorMeeting({ kind: 'reminder', meeting, request }), { dedupeKey, availableAt: new Date(time) }));
  await notificationRepository.enqueue([email(templates.investorMeeting({ kind, meeting, request })), ...reminders]);
});

// Rendez-vous retiré sans prévenir la personne (erreur de saisie) : ses rappels disparaissent.
const investorMeetingRemoved = (meeting) => dispatch(() => notificationRepository.cancelPending(`investor-meeting-reminder:${meeting.id}`));

// Engagement de suivi d'une entreprise en difficulté : l'engagement écrit lui est envoyé ; le responsable (ou l'équipe API-ZF)
// est alerté à l'échéance si aucune réponse n'est enregistrée. Une réponse enregistrée retire l'alerte.
const investorCommitmentChanged = (request, { notifyCompany = false, serviceTitle = null } = {}) => dispatch(async () => {
  const dedupeKey = `investor-commitment:${request.id}`;
  await notificationRepository.cancelPending(dedupeKey);
  const jobs = notifyCompany ? [{ channel: 'email', recipient: request.email, payload: templates.investorSupportCommitment({ request, serviceTitle }) }] : [];
  const dueAt = request.commitmentDueAt ? new Date(request.commitmentDueAt) : null;
  if (dueAt && dueAt > new Date() && !request.resolvedAt) {
    const contact = request.contactUserId ? await notificationRepository.findActiveUser(request.contactUserId) : null;
    const users = contact ? [contact] : await notificationRepository.findSuperAdmins();
    jobs.push(...forUsers(users, (user) => ({ ...templates.investorCommitmentDue({ user, request }), tag: dedupeKey }), { dedupeKey, availableAt: dueAt }));
  }
  if (jobs.length) await notificationRepository.enqueue(jobs);
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

const b2bMeetingMoved = (meeting, proposal) => dispatch(async () => {
  await notificationRepository.enqueue([
    { channel: 'email', recipient: proposal.email, payload: templates.b2bMeetingMoved({ meeting, proposal, need: proposal.need, occupant: proposal.need.occupant }) },
  ]);
});

const b2bMeetingCancelled = (meeting, proposal) => dispatch(async () => {
  await notificationRepository.enqueue([
    { channel: 'email', recipient: proposal.email, payload: templates.b2bMeetingCancelled({ meeting, proposal, need: proposal.need, occupant: proposal.need.occupant }) },
  ]);
});

// Studio : l'auteur de l'invitation et l'équipe du stand (ou l'API-ZF) suivent les réponses de l'invité.
const studioTeam = async (invitation) => {
  const creator = invitation.createdByUserId ? await notificationRepository.findActiveUser(invitation.createdByUserId) : null;
  return [...(creator ? [creator] : []), ...(await standTeam(invitation.occupantId))];
};
const studioReminderKey = (invitation) => `studio-reminder:${invitation.id}`;
const studioEmail = (invitation, payload, extra = {}) => ({ channel: 'email', recipient: invitation.email, payload, ...extra });

// Invitation personnelle : le lien pour choisir son créneau.
const studioInvited = (invitation) => dispatch(async () => {
  if (!invitation.email) return;
  await notificationRepository.enqueue([studioEmail(invitation, templates.studioInvitation({ invitation }))]);
});

// Créneau réservé ou changé : confirmation à l'invité, rappels la veille et une heure avant, information de l'équipe.
const studioBooked = (invitation, changed) => dispatch(async () => {
  const dedupeKey = studioReminderKey(invitation);
  await notificationRepository.cancelPending(dedupeKey);
  const start = new Date(invitation.scheduledAt).getTime();
  const reminders = [start - 24 * 60 * 60 * 1000, start - 60 * 60 * 1000]
    .filter((time) => time > Date.now())
    .map((time) => studioEmail(invitation, templates.studioReminder({ invitation }), { dedupeKey, availableAt: new Date(time) }));
  await notificationRepository.enqueue([
    ...(invitation.email ? [studioEmail(invitation, templates.studioBookingConfirmation({ invitation, changed })), ...reminders] : []),
    ...forUsers(await studioTeam(invitation), (user) => templates.studioGuestAnswered({ user, invitation, answer: changed ? 'moved' : 'booked' })),
  ]);
});

const studioDeclined = (invitation) => dispatch(async () => {
  await notificationRepository.cancelPending(studioReminderKey(invitation));
  await notificationRepository.enqueue(forUsers(await studioTeam(invitation), (user) => templates.studioGuestAnswered({ user, invitation, answer: 'declined' })));
});

// Passage annulé par l'équipe (ou invitation supprimée) : plus de rappels ; l'invité est prévenu si son créneau était à venir.
const studioCancelled = (invitation, notifyGuest) => dispatch(async () => {
  await notificationRepository.cancelPending(studioReminderKey(invitation));
  if (notifyGuest && invitation.email) await notificationRepository.enqueue([studioEmail(invitation, templates.studioCancellation({ invitation }))]);
});

// Livraison de la capsule, prête à partager.
const studioCapsuleDelivered = (invitation) => dispatch(async () => {
  if (!invitation.email) return;
  await notificationRepository.enqueue([studioEmail(invitation, templates.studioCapsule({ invitation }))]);
});

module.exports = {
  contactRequested,
  contactReminderChanged,
  investorRequestReceived,
  investorFollowUpChanged,
  investorFollowUpRemoved,
  investorMeetingChanged,
  investorMeetingRemoved,
  investorCommitmentChanged,
  b2bProposalReceived,
  b2bProposalDecided,
  b2bMeetingScheduled,
  b2bMeetingMoved,
  b2bMeetingCancelled,
  studioInvited,
  studioBooked,
  studioDeclined,
  studioCancelled,
  studioCapsuleDelivered,
};
