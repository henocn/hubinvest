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
  const admins = occupantId ? await notificationRepository.findStandUsers(occupantId, [roles.OCCUPANT]) : [];
  return admins.length > 0 ? admins : notificationRepository.findSuperAdmins();
};

// Prévient les occupants d'un stand qu'un visiteur demande à être recontacté.
const contactRequested = (occupant) => dispatch(async () => {
  const users = await notificationRepository.findStandUsers(occupant.id, [roles.OCCUPANT]);
  if (users.length === 0) return;
  await notificationRepository.enqueue(forUsers(users, (user) => templates.contactRequested({ user, occupant })));
});

// Nouveau contact aux guichets : l'équipe de l'API-ZF (dont les occupants du Stand API-ZF) est prévenue. Une demande de rappel
// n'envoie rien à la personne : l'équipe la rappelle (un rendez-vous réservé reçoit son propre e-mail, avec ses rappels).
const investorRequestReceived = (request) => dispatch(async () => {
  const team = await notificationRepository.findApizfTeam();
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
  const users = contact ? [contact] : await notificationRepository.findApizfTeam();
  if (users.length === 0) return;
  await notificationRepository.enqueue(forUsers(
    users,
    (user) => ({ ...templates.investorFollowUpDue({ user, request, followUp }), tag: dedupeKey }),
    { dedupeKey, availableAt: dueAt },
  ));
});

// Relance d'un contact de stand : à son heure, l'auteur de la relance (ou l'équipe du stand) est rappelé, avec le motif.
const contactFollowUpKey = (followUp) => `contact-follow-up:${followUp.id}`;
const contactFollowUpChanged = (followUp, contact) => dispatch(async () => {
  const dedupeKey = contactFollowUpKey(followUp);
  await notificationRepository.cancelPending(dedupeKey);
  const dueAt = new Date(followUp.dueAt);
  if (followUp.doneAt || Number.isNaN(dueAt.getTime()) || dueAt <= new Date()) return;
  const author = followUp.createdByUserId ? await notificationRepository.findActiveUser(followUp.createdByUserId) : null;
  const users = author ? [author] : await notificationRepository.findStandUsers(contact.occupantId, [roles.OCCUPANT]);
  if (users.length === 0) return;
  await notificationRepository.enqueue(forUsers(
    users,
    (user) => ({ ...templates.contactFollowUpDue({ user, contact, followUp }), tag: dedupeKey }),
    { dedupeKey, availableAt: dueAt },
  ));
});
const contactFollowUpRemoved = (followUp) => dispatch(() => notificationRepository.cancelPending(contactFollowUpKey(followUp)));

// Relance d'une rencontre B2B : à son heure, son auteur (ou l'équipe du stand) est rappelé, avec le motif.
const b2bFollowUpKey = (followUp) => `b2b-follow-up:${followUp.id}`;
const b2bFollowUpChanged = (followUp, proposal) => dispatch(async () => {
  const dedupeKey = b2bFollowUpKey(followUp);
  await notificationRepository.cancelPending(dedupeKey);
  const dueAt = new Date(followUp.dueAt);
  if (followUp.doneAt || Number.isNaN(dueAt.getTime()) || dueAt <= new Date()) return;
  const author = followUp.createdByUserId ? await notificationRepository.findActiveUser(followUp.createdByUserId) : null;
  const users = author ? [author] : await standTeam(proposal.need?.occupantId);
  if (users.length === 0) return;
  await notificationRepository.enqueue(forUsers(
    users,
    (user) => ({ ...templates.b2bFollowUpDue({ user, proposal, followUp }), tag: dedupeKey }),
    { dedupeKey, availableAt: dueAt },
  ));
});
const b2bFollowUpRemoved = (followUp) => dispatch(() => notificationRepository.cancelPending(b2bFollowUpKey(followUp)));

// Relance faite ou supprimée : son alerte disparaît.
const investorFollowUpRemoved = (followUp) => dispatch(() => notificationRepository.cancelPending(followUpKey(followUp)));

// Messages aux visiteurs (sans compte) :
// - confirmation, déplacement, annulation, invitation, capsule : l'e-mail, et WhatsApp en plus quand il est activé et que
//   la personne a laissé un téléphone ;
// - rappel (la veille et une heure avant) : WhatsApp quand c'est possible, l'e-mail sinon ; si WhatsApp échoue (numéro
//   sans WhatsApp, plafond du jour…), le service notifier envoie l'e-mail prévu en repli.
const whatsappReady = (phone) => env.whatsapp.enabled && Boolean(phone);
const visitorJobs = ({ email, phone, emailPayload, whatsapp, extra = {} }) => [
  ...(email ? [{ channel: 'email', recipient: email, payload: emailPayload, ...extra }] : []),
  ...(whatsappReady(phone) && whatsapp ? [{ channel: 'whatsapp', recipient: phone, payload: whatsapp, ...extra }] : []),
];
const reminderJob = ({ email, phone, emailPayload, whatsapp, extra = {} }) => {
  if (whatsappReady(phone) && whatsapp) {
    return [{ channel: 'whatsapp', recipient: phone, payload: { ...whatsapp, fallback: email ? { recipient: email, ...emailPayload } : null }, ...extra }];
  }
  return email ? [{ channel: 'email', recipient: email, payload: emailPayload, ...extra }] : [];
};
// Rappels la veille et une heure avant un rendez-vous, s'ils sont encore à venir.
const reminderTimes = (startsAt) => {
  const start = new Date(startsAt).getTime();
  return [start - 24 * 60 * 60 * 1000, start - 60 * 60 * 1000].filter((time) => time > Date.now()).map((time) => new Date(time));
};

// Rendez-vous aux guichets fixé, déplacé ou annulé : la personne est prévenue (e-mail, WhatsApp), puis rappelée la veille
// et une heure avant ; un déplacement remplace les rappels, une annulation les retire.
const investorMeetingChanged = (kind, meeting, request) => dispatch(async () => {
  const dedupeKey = `investor-meeting-reminder:${meeting.id}`;
  await notificationRepository.cancelPending(dedupeKey);
  const contact = { email: request.email, phone: request.phone };
  const reminders = kind === 'cancelled' ? [] : reminderTimes(meeting.startsAt).flatMap((availableAt) => reminderJob({
    ...contact,
    emailPayload: templates.investorMeeting({ kind: 'reminder', meeting, request }),
    whatsapp: templates.investorMeetingWhatsapp({ kind: 'reminder', meeting, request }),
    extra: { dedupeKey, availableAt },
  }));
  await notificationRepository.enqueue([
    ...visitorJobs({ ...contact, emailPayload: templates.investorMeeting({ kind, meeting, request }), whatsapp: templates.investorMeetingWhatsapp({ kind, meeting, request }) }),
    ...reminders,
  ]);
});

// Rendez-vous retiré sans prévenir la personne (erreur de saisie) : ses rappels disparaissent.
const investorMeetingRemoved = (meeting) => dispatch(() => notificationRepository.cancelPending(`investor-meeting-reminder:${meeting.id}`));

// Prévient l'équipe du stand et confirme au professionnel l'envoi de sa proposition (e-mail seulement).
const b2bProposalReceived = (proposal, need) => dispatch(async () => {
  const { occupant } = need;
  const team = await standTeam(occupant.id);
  await notificationRepository.enqueue([
    ...forUsers(team, (user) => templates.b2bProposalReceived({ user, need })),
    { channel: 'email', recipient: proposal.email, payload: templates.b2bProposalConfirmation({ proposal, need, occupant }) },
  ]);
});

// Informe le professionnel de l'acceptation ou du refus de sa proposition (e-mail ; le rendez-vous suit par WhatsApp).
const b2bProposalDecided = (proposal, need) => dispatch(async () => {
  await notificationRepository.enqueue([
    { channel: 'email', recipient: proposal.email, payload: templates.b2bProposalDecision({ proposal, need, occupant: need.occupant }) },
  ]);
});

// Rendez-vous B2B fixé ou déplacé : le visiteur est prévenu, puis rappelé la veille et une heure avant.
const b2bReminderKey = (meeting) => `b2b-meeting-reminder:${meeting.id}`;
const b2bMeetingNotified = (kind, meeting, proposal) => dispatch(async () => {
  const dedupeKey = b2bReminderKey(meeting);
  await notificationRepository.cancelPending(dedupeKey);
  const need = proposal.need;
  const values = { meeting, proposal, need, occupant: need.occupant };
  const contact = { email: proposal.email, phone: proposal.phone };
  const emailPayload = kind === 'moved' ? templates.b2bMeetingMoved(values) : templates.b2bMeetingScheduled(values);
  await notificationRepository.enqueue([
    ...visitorJobs({ ...contact, emailPayload, whatsapp: templates.b2bMeetingWhatsapp({ kind, ...values }) }),
    ...reminderTimes(meeting.startsAt).flatMap((availableAt) => reminderJob({
      ...contact,
      emailPayload: templates.b2bMeetingReminder(values),
      whatsapp: templates.b2bMeetingWhatsapp({ kind: 'reminder', ...values }),
      extra: { dedupeKey, availableAt },
    })),
  ]);
});
const b2bMeetingScheduled = (meeting, proposal) => b2bMeetingNotified('scheduled', meeting, proposal);
const b2bMeetingMoved = (meeting, proposal) => b2bMeetingNotified('moved', meeting, proposal);

// Rendez-vous B2B annulé : ses rappels disparaissent ; le visiteur est prévenu s'il était à venir.
const b2bMeetingCancelled = (meeting, proposal, { notifyVisitor = true } = {}) => dispatch(async () => {
  await notificationRepository.cancelPending(b2bReminderKey(meeting));
  if (!notifyVisitor) return;
  const values = { meeting, proposal, need: proposal.need, occupant: proposal.need.occupant };
  await notificationRepository.enqueue(visitorJobs({
    email: proposal.email,
    phone: proposal.phone,
    emailPayload: templates.b2bMeetingCancelled(values),
    whatsapp: templates.b2bMeetingWhatsapp({ kind: 'cancelled', ...values }),
  }));
});

// Studio : l'équipe API-ZF (seule à gérer le Studio), dont l'auteur de l'invitation, suit les réponses de l'invité.
const studioTeam = async (invitation) => {
  const creator = invitation.createdByUserId ? await notificationRepository.findActiveUser(invitation.createdByUserId) : null;
  const team = await notificationRepository.findSuperAdmins();
  return [...(creator ? [creator] : []), ...team.filter((user) => user.id !== creator?.id)];
};
const studioReminderKey = (invitation) => `studio-reminder:${invitation.id}`;
const guest = (invitation) => ({ email: invitation.email, phone: invitation.phone });

// Invitation personnelle : le lien pour choisir son créneau.
const studioInvited = (invitation) => dispatch(async () => {
  const jobs = visitorJobs({ ...guest(invitation), emailPayload: templates.studioInvitation({ invitation }), whatsapp: templates.studioInvitationWhatsapp({ invitation }) });
  if (jobs.length) await notificationRepository.enqueue(jobs);
});

// Créneau réservé ou changé : confirmation à l'invité, rappels la veille et une heure avant, information de l'équipe.
// « byTeam » : l'équipe a fixé ou déplacé le créneau elle-même ; seul l'invité est prévenu.
const studioBooked = (invitation, changed, { byTeam = false } = {}) => dispatch(async () => {
  const dedupeKey = studioReminderKey(invitation);
  await notificationRepository.cancelPending(dedupeKey);
  const kind = changed ? 'moved' : 'scheduled';
  await notificationRepository.enqueue([
    ...visitorJobs({ ...guest(invitation), emailPayload: templates.studioBookingConfirmation({ invitation, changed }), whatsapp: templates.studioMeetingWhatsapp({ kind, invitation }) }),
    ...reminderTimes(invitation.scheduledAt).flatMap((availableAt) => reminderJob({
      ...guest(invitation),
      emailPayload: templates.studioReminder({ invitation }),
      whatsapp: templates.studioMeetingWhatsapp({ kind: 'reminder', invitation }),
      extra: { dedupeKey, availableAt },
    })),
    ...(byTeam ? [] : forUsers(await studioTeam(invitation), (user) => templates.studioGuestAnswered({ user, invitation, answer: changed ? 'moved' : 'booked' }))),
  ]);
});

const studioDeclined = (invitation) => dispatch(async () => {
  await notificationRepository.cancelPending(studioReminderKey(invitation));
  await notificationRepository.enqueue(forUsers(await studioTeam(invitation), (user) => templates.studioGuestAnswered({ user, invitation, answer: 'declined' })));
});

// Passage annulé par l'équipe (ou invitation supprimée) : plus de rappels ; l'invité est prévenu si son créneau était à venir.
const studioCancelled = (invitation, notifyGuest) => dispatch(async () => {
  await notificationRepository.cancelPending(studioReminderKey(invitation));
  if (!notifyGuest) return;
  const jobs = visitorJobs({ ...guest(invitation), emailPayload: templates.studioCancellation({ invitation }), whatsapp: templates.studioMeetingWhatsapp({ kind: 'cancelled', invitation }) });
  if (jobs.length) await notificationRepository.enqueue(jobs);
});

// Livraison de la capsule, prête à partager.
const studioCapsuleDelivered = (invitation) => dispatch(async () => {
  const jobs = visitorJobs({ ...guest(invitation), emailPayload: templates.studioCapsule({ invitation }), whatsapp: templates.studioCapsuleWhatsapp({ invitation }) });
  if (jobs.length) await notificationRepository.enqueue(jobs);
});

// Question du public pendant un direct : l'API-ZF et les animateurs sont prévenus en push (pas d'e-mail).
const liveQuestionReceived = (question, event) => dispatch(async () => {
  const team = await notificationRepository.findQuestionTeam();
  if (team.length) await notificationRepository.enqueue(forUsers(team, () => templates.liveQuestionReceived({ question, event })));
});

module.exports = {
  b2bFollowUpChanged,
  b2bFollowUpRemoved,
  contactFollowUpChanged,
  contactFollowUpRemoved,
  liveQuestionReceived,
  contactRequested,
  investorRequestReceived,
  investorFollowUpChanged,
  investorFollowUpRemoved,
  investorMeetingChanged,
  investorMeetingRemoved,
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
