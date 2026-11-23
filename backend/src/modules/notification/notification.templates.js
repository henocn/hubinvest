const env = require('../../config/env');
const settingsService = require('../settings/settings.service');
const { guichetLabel } = require('../../shared/guichets');

// Liens vers la bonne rubrique de l'espace équipe.
const teamUrl = (path) => `${env.appUrls.backoffice}${path}`;
const occupantSpaceUrl = () => teamUrl('/contacts');

// Construit le texte d'un e-mail interne à partir du message court et du lien utile.
const teamText = (user, lines, url) => [
  `Bonjour ${user.firstName},`,
  '',
  ...lines,
  '',
  url,
  '',
  'HubInvest',
].join('\n');

// Prévient l'équipe d'un stand qu'un visiteur demande à être recontacté.
const contactRequested = ({ user, occupant }) => ({
  title: 'Nouvelle demande de contact',
  body: 'Une personne souhaite être recontactée par votre stand.',
  url: occupantSpaceUrl(),
  subject: 'Nouvelle demande de contact sur HubInvest',
  text: teamText(user, [`Une personne a demandé à être recontactée par ${occupant.name}.`, 'Retrouvez sa demande dans vos contacts :'], occupantSpaceUrl()),
});

// Rappelle à l'équipe du stand la prochaine action prévue sur un contact.
const contactReminder = ({ user, contact }) => {
  const action = contact.nextAction || 'Relance prévue';
  return {
    title: 'Relance à faire',
    body: `${contact.fullName} : ${action}`,
    url: occupantSpaceUrl(),
    subject: `Relance à faire : ${contact.fullName}`,
    text: teamText(user, [`Une action est prévue maintenant pour ${contact.fullName} :`, action], occupantSpaceUrl()),
  };
};

// Prévient l'équipe qu'un rendez-vous au guichet vient d'être réservé, ou qu'une personne demande à être rappelée.
const investorRequestReceived = ({ user, request }) => {
  const url = teamUrl(`/guichets/${request.id}`);
  const guichet = guichetLabel(request.guichet);
  const booked = request.source === 'online_booking';
  const body = booked ? `${request.fullName} a réservé un rendez-vous au guichet « ${guichet} ».` : `${request.fullName} demande à être rappelé (guichet « ${guichet} »).`;
  return {
    title: booked ? 'Rendez-vous au guichet' : 'Demande de rappel',
    body,
    url,
    subject: booked ? `Rendez-vous au guichet : ${request.fullName}` : `Demande de rappel : ${request.fullName}`,
    text: teamText(user, [body, 'Consultez sa fiche :'], url),
  };
};

// Rappel au responsable : c'est l'heure d'une relance, avec son motif.
const investorFollowUpDue = ({ user, request, followUp }) => {
  const url = teamUrl(`/guichets/${request.id}`);
  return {
    title: `Relance à faire : ${request.fullName}`,
    body: `Relancer ${request.fullName} : ${followUp.reason}`,
    url,
    subject: `Relance à faire : ${request.fullName}`,
    text: teamText(user, [`C’est l’heure de relancer ${request.fullName} : ${followUp.reason}.`, 'Une fois la relance faite, marquez-la faite sur sa fiche :'], url),
  };
};

// Prévient l'équipe qu'une proposition de rencontre répond à un besoin B2B.
const b2bProposalReceived = ({ user, need }) => ({
  title: 'Nouvelle proposition B2B',
  body: `Le besoin « ${need.title} » a reçu une proposition.`,
  url: teamUrl('/b2b'),
  subject: 'Nouvelle proposition B2B',
  text: teamText(user, [`Le besoin « ${need.title} » a reçu une proposition de rencontre.`, 'Acceptez-la ou refusez-la dans l’administration :'], teamUrl('/b2b')),
});

// Prévient l'équipe qu'un invité a répondu à son invitation au Studio.
// Prévient l'équipe de la réponse d'un invité du Studio (créneau réservé, changé ou invitation déclinée).
const studioGuestAnswered = ({ user, invitation, answer }) => {
  const when = invitation.scheduledAt ? meetingWhen({ startsAt: invitation.scheduledAt }, 'fr') : '';
  const sentence = { booked: `a réservé son passage au Studio le ${when}`, moved: `a changé son passage au Studio pour le ${when}`, declined: 'a décliné l’invitation au Studio' }[answer];
  return {
    title: 'Studio : réponse d’un invité',
    body: `${invitation.guestName} ${sentence}.`,
    url: teamUrl('/studio'),
    subject: `Studio : ${invitation.guestName} ${sentence}`,
    text: teamText(user, [`${invitation.guestName} ${sentence}.`, 'Consultez le planning du Studio :'], teamUrl('/studio')),
  };
};

const publicCopy = {
  fr: {
    hello: (name) => `Bonjour ${name},`,
    signature: 'L’équipe HubInvest',
    proposalSubject: 'Votre proposition a bien été transmise',
    proposalBody: (need, occupant) => `Votre proposition pour le besoin « ${need} » a bien été transmise à ${occupant}. Vous recevrez un e-mail dès qu’elle aura été examinée.`,
    acceptedSubject: 'Votre proposition a été acceptée',
    acceptedBody: (need, occupant) => `${occupant} a accepté votre proposition pour le besoin « ${need} ». Vous recevrez un e-mail avec le jour, l’heure et la table de votre rendez-vous.`,
    declinedSubject: 'Suite donnée à votre proposition',
    declinedBody: (need, occupant) => `${occupant} n’a pas retenu votre proposition pour le besoin « ${need} ». Merci de votre intérêt.`,
  },
  en: {
    hello: (name) => `Hello ${name},`,
    signature: 'The HubInvest team',
    proposalSubject: 'Your proposal has been sent',
    proposalBody: (need, occupant) => `Your proposal for the need “${need}” has been sent to ${occupant}. You will receive an email once it has been reviewed.`,
    acceptedSubject: 'Your proposal has been accepted',
    acceptedBody: (need, occupant) => `${occupant} has accepted your proposal for the need “${need}”. You will receive an email with the day, time and table of your meeting.`,
    declinedSubject: 'Update on your proposal',
    declinedBody: (need, occupant) => `${occupant} has not taken your proposal forward for the need “${need}”. Thank you for your interest.`,
  },
};

// Choisit les textes publics dans la langue du visiteur.
const copyFor = (language) => publicCopy[language] || publicCopy.fr;

// Assemble un e-mail public court et signé.
const publicEmail = (copy, name, subject, body) => ({
  subject,
  text: [copy.hello(name), '', body, '', copy.signature].join('\n'),
});


// Confirme au professionnel que sa proposition B2B est transmise.
const b2bProposalConfirmation = ({ proposal, need, occupant }) => {
  const copy = copyFor(proposal.language);
  return publicEmail(copy, proposal.fullName, copy.proposalSubject, copy.proposalBody(need.title, occupant.name));
};

// Informe le professionnel de la décision prise sur sa proposition B2B.
const b2bProposalDecision = ({ proposal, need, occupant }) => {
  const copy = copyFor(proposal.language);
  return proposal.status === 'accepted'
    ? publicEmail(copy, proposal.fullName, copy.acceptedSubject, copy.acceptedBody(need.title, occupant.name))
    : publicEmail(copy, proposal.fullName, copy.declinedSubject, copy.declinedBody(need.title, occupant.name));
};

// Date et heure d'un rendez-vous B2B, à l'heure de Lomé, dans la langue du visiteur.
const meetingWhen = (meeting, language) => new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'fr-FR', {
  timeZone: 'Africa/Lome',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(meeting.startsAt));

const meetingCopy = {
  fr: {
    scheduledSubject: 'Votre rendez-vous B2B est fixé',
    scheduledBody: (when, minutes, table, need, occupant) => `Votre rendez-vous avec ${occupant} pour le besoin « ${need} » est fixé le ${when}, pour ${minutes} minutes, à la table ${table} de l’espace B2B du Hub.`,
    movedSubject: 'Votre rendez-vous B2B est déplacé',
    cancelledSubject: 'Votre rendez-vous B2B est annulé',
    cancelledBody: (when, need, occupant) => `Le rendez-vous avec ${occupant} pour le besoin « ${need} », prévu le ${when}, est annulé. L’équipe du stand reviendra vers vous si une autre date est proposée.`,
  },
  en: {
    scheduledSubject: 'Your B2B meeting is confirmed',
    scheduledBody: (when, minutes, table, need, occupant) => `Your meeting with ${occupant} about the need “${need}” is set for ${when}, for ${minutes} minutes, at table ${table} in the Hub’s B2B area.`,
    movedSubject: 'Your B2B meeting has been moved',
    cancelledSubject: 'Your B2B meeting is cancelled',
    cancelledBody: (when, need, occupant) => `The meeting with ${occupant} about the need “${need}”, planned for ${when}, is cancelled. The stand team will get back to you if another date is offered.`,
  },
};

// Donne au visiteur le jour, l'heure, la durée et la table de son rendez-vous B2B.
const b2bMeetingScheduled = ({ meeting, proposal, need, occupant }) => {
  const copy = copyFor(proposal.language);
  const text = meetingCopy[proposal.language] || meetingCopy.fr;
  return publicEmail(copy, proposal.fullName, text.scheduledSubject, text.scheduledBody(meetingWhen(meeting, proposal.language), meeting.durationMinutes, meeting.tableNumber, need.title, occupant.name));
};

// Donne au visiteur la nouvelle date de son rendez-vous B2B déplacé (même texte que la confirmation).
const b2bMeetingMoved = ({ meeting, proposal, need, occupant }) => {
  const copy = copyFor(proposal.language);
  const text = meetingCopy[proposal.language] || meetingCopy.fr;
  return publicEmail(copy, proposal.fullName, text.movedSubject, text.scheduledBody(meetingWhen(meeting, proposal.language), meeting.durationMinutes, meeting.tableNumber, need.title, occupant.name));
};

// Prévient le visiteur que son rendez-vous B2B à venir est annulé.
const b2bMeetingCancelled = ({ meeting, proposal, need, occupant }) => {
  const copy = copyFor(proposal.language);
  const text = meetingCopy[proposal.language] || meetingCopy.fr;
  return publicEmail(copy, proposal.fullName, text.cancelledSubject, text.cancelledBody(meetingWhen(meeting, proposal.language), need.title, occupant.name));
};

const investorMeetingCopy = {
  fr: {
    scheduled: ['Votre rendez-vous avec l’API-ZF', (when, place) => `Votre rendez-vous avec l’équipe de l’API-ZF est fixé le ${when}, lieu : ${place}. Nous vous attendons, sauf si vous recevez un e-mail de modification ou d’annulation.`],
    moved: ['Votre rendez-vous avec l’API-ZF est déplacé', (when, place) => `Votre rendez-vous avec l’équipe de l’API-ZF est déplacé au ${when}, lieu : ${place}.`],
    reminder: ['Rappel : votre rendez-vous avec l’API-ZF', (when, place) => `Nous vous attendons le ${when}, lieu : ${place}.`],
    cancelled: ['Votre rendez-vous avec l’API-ZF est annulé', (when) => `Le rendez-vous avec l’équipe de l’API-ZF prévu le ${when} est annulé. Votre interlocuteur reviendra vers vous.`],
  },
  en: {
    scheduled: ['Your meeting with API-ZF', (when, place) => `Your meeting with the API-ZF team is set for ${when}, at: ${place}. We look forward to seeing you, unless you receive an email changing or cancelling it.`],
    moved: ['Your meeting with API-ZF has been moved', (when, place) => `Your meeting with the API-ZF team has been moved to ${when}, at: ${place}.`],
    reminder: ['Reminder: your meeting with API-ZF', (when, place) => `We look forward to seeing you on ${when}, at: ${place}.`],
    cancelled: ['Your meeting with API-ZF is cancelled', (when) => `The meeting with the API-ZF team planned for ${when} is cancelled. Your contact will get back to you.`],
  },
};

// Rendez-vous Investor Desk fixé, déplacé ou annulé, dans la langue de l'investisseur.
const investorMeeting = ({ kind, meeting, request }) => {
  const copy = copyFor(request.language);
  const [subject, body] = (investorMeetingCopy[request.language] || investorMeetingCopy.fr)[kind];
  return publicEmail(copy, request.fullName, subject, body(meetingWhen(meeting, request.language), meeting.location));
};

// Studio : le lien personnel de l'invité, ses formats et ses e-mails dans sa langue.
const studioLink = (invitation) => `${env.appUrls.public}/studio/${invitation.token}`;
const studioCopy = {
  fr: {
    inviteSubject: 'Votre invitation au Studio du Hub de l’Investissement',
    invite: (format, link) => `Vous êtes invité(e) à enregistrer « ${format} » au Studio du Hub de l’Investissement (FIL 2026). Choisissez vous-même votre créneau sur votre page personnelle : ${link}`,
    bookedSubject: 'Votre passage au Studio est réservé',
    movedSubject: 'Votre passage au Studio est déplacé',
    booked: (when, minutes, link) => `Votre passage au Studio est réservé le ${when}, pour ${minutes} minutes. Vous pouvez changer de créneau jusqu’à une heure avant : ${link}`,
    reminderSubject: 'Rappel : votre passage au Studio',
    reminder: (when, link) => `Nous vous attendons au Studio du Hub de l’Investissement le ${when}. Votre page : ${link}`,
    cancelledSubject: 'Votre passage au Studio est annulé',
    cancelled: (when) => `Votre passage au Studio prévu le ${when} est annulé. L’équipe du Studio reviendra vers vous.`,
    capsuleSubject: 'Votre capsule est prête à partager',
    capsule: (url) => `Merci pour votre passage au Studio du Hub de l’Investissement. Votre capsule est prête : partagez-la sur vos réseaux. ${url}`,
  },
  en: {
    inviteSubject: 'Your invitation to the Investment Hub Studio',
    invite: (format, link) => `You are invited to record “${format}” at the Investment Hub Studio (FIL 2026). Choose your own time slot on your personal page: ${link}`,
    bookedSubject: 'Your Studio session is booked',
    movedSubject: 'Your Studio session has been moved',
    booked: (when, minutes, link) => `Your Studio session is booked for ${when}, for ${minutes} minutes. You can change your slot up to one hour before: ${link}`,
    reminderSubject: 'Reminder: your Studio session',
    reminder: (when, link) => `We look forward to seeing you at the Investment Hub Studio on ${when}. Your page: ${link}`,
    cancelledSubject: 'Your Studio session is cancelled',
    cancelled: (when) => `Your Studio session planned for ${when} is cancelled. The Studio team will get back to you.`,
    capsuleSubject: 'Your video is ready to share',
    capsule: (url) => `Thank you for your Studio session at the Investment Hub. Your video is ready: share it on your networks. ${url}`,
  },
};
const studioText = (invitation) => studioCopy[invitation.language] || studioCopy.fr;
const studioWhen = (invitation) => meetingWhen({ startsAt: invitation.scheduledAt }, invitation.language);

const studioInvitation = ({ invitation }) => {
  const text = studioText(invitation);
  const format = settingsService.studioFormatLabel(invitation.format, invitation.language) || 'Studio';
  return publicEmail(copyFor(invitation.language), invitation.guestName, text.inviteSubject, text.invite(format, studioLink(invitation)));
};

const studioBookingConfirmation = ({ invitation, changed }) => {
  const text = studioText(invitation);
  const { minutes } = settingsService.studioSchedule();
  return publicEmail(copyFor(invitation.language), invitation.guestName, changed ? text.movedSubject : text.bookedSubject, text.booked(studioWhen(invitation), minutes, studioLink(invitation)));
};

const studioReminder = ({ invitation }) => {
  const text = studioText(invitation);
  return publicEmail(copyFor(invitation.language), invitation.guestName, text.reminderSubject, text.reminder(studioWhen(invitation), studioLink(invitation)));
};

const studioCancellation = ({ invitation }) => {
  const text = studioText(invitation);
  return publicEmail(copyFor(invitation.language), invitation.guestName, text.cancelledSubject, text.cancelled(studioWhen(invitation)));
};

const studioCapsule = ({ invitation }) => {
  const text = studioText(invitation);
  return publicEmail(copyFor(invitation.language), invitation.guestName, text.capsuleSubject, text.capsule(invitation.capsuleUrl));
};

module.exports = {
  studioGuestAnswered,
  studioInvitation,
  studioBookingConfirmation,
  studioReminder,
  studioCancellation,
  studioCapsule,
  investorFollowUpDue,
  investorMeeting,
  b2bMeetingScheduled,
  b2bMeetingMoved,
  b2bMeetingCancelled,
  contactRequested,
  contactReminder,
  investorRequestReceived,
  b2bProposalReceived,
  b2bProposalConfirmation,
  b2bProposalDecision,
};
