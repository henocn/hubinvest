const env = require('../../config/env');

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

// Prévient l'équipe qu'un projet a été déposé à l'Investor Desk.
const investorRequestReceived = ({ user }) => ({
  title: 'Nouvelle demande Investor Desk',
  body: 'Un projet vient d’être présenté à l’API-ZF.',
  url: teamUrl('/investor-desk'),
  subject: 'Nouvelle demande Investor Desk',
  text: teamText(user, ['Un projet vient d’être présenté à l’API-ZF depuis l’Investor Desk.', 'Consultez-le dans l’administration :'], teamUrl('/investor-desk')),
});

// Prévient l'équipe qu'une proposition de rencontre répond à un besoin B2B.
const b2bProposalReceived = ({ user, need }) => ({
  title: 'Nouvelle proposition B2B',
  body: `Le besoin « ${need.title} » a reçu une proposition.`,
  url: teamUrl('/b2b'),
  subject: 'Nouvelle proposition B2B',
  text: teamText(user, [`Le besoin « ${need.title} » a reçu une proposition de rencontre.`, 'Acceptez-la ou refusez-la dans l’administration :'], teamUrl('/b2b')),
});

// Prévient l'équipe qu'un invité a répondu à son invitation au Studio.
const studioInvitationAnswered = ({ user, invitation }) => {
  const answer = invitation.status === 'confirmed' ? 'a confirmé' : 'a décliné';
  return {
    title: 'Réponse à une invitation Studio',
    body: `${invitation.guestName} ${answer} l’invitation.`,
    url: teamUrl('/studio'),
    subject: `Studio : ${invitation.guestName} ${answer} l’invitation`,
    text: teamText(user, [`${invitation.guestName} ${answer} l’invitation « ${invitation.subject} ».`, 'Consultez le planning du Studio :'], teamUrl('/studio')),
  };
};

const publicCopy = {
  fr: {
    hello: (name) => `Bonjour ${name},`,
    signature: 'L’équipe HubInvest',
    investorSubject: 'Votre demande a bien été reçue',
    investorBody: () => `Votre demande adressée à l’API-ZF depuis l’Investor Desk a bien été enregistrée. Elle sera étudiée par l’équipe concernée.`,
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
    investorSubject: 'We have received your request',
    investorBody: () => 'Your request to API-ZF through the Investor Desk has been recorded. It will be reviewed by the team concerned.',
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

// Confirme à l'investisseur que sa demande est enregistrée.
const investorRequestConfirmation = ({ request }) => {
  const copy = copyFor(request.language);
  return publicEmail(copy, request.fullName, copy.investorSubject, copy.investorBody());
};

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
    scheduledBody: (when, minutes, table, need, occupant) => `Votre rendez-vous avec ${occupant} pour le besoin « ${need} » est fixé le ${when} (heure de Lomé), pour ${minutes} minutes, à la table ${table} de l’espace B2B du Hub.`,
    cancelledSubject: 'Votre rendez-vous B2B est annulé',
    cancelledBody: (when, need, occupant) => `Le rendez-vous avec ${occupant} pour le besoin « ${need} », prévu le ${when}, est annulé. L’équipe du stand reviendra vers vous si une autre date est proposée.`,
  },
  en: {
    scheduledSubject: 'Your B2B meeting is confirmed',
    scheduledBody: (when, minutes, table, need, occupant) => `Your meeting with ${occupant} about the need “${need}” is set for ${when} (Lomé time), for ${minutes} minutes, at table ${table} in the Hub’s B2B area.`,
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

// Prévient le visiteur que son rendez-vous B2B à venir est annulé.
const b2bMeetingCancelled = ({ meeting, proposal, need, occupant }) => {
  const copy = copyFor(proposal.language);
  const text = meetingCopy[proposal.language] || meetingCopy.fr;
  return publicEmail(copy, proposal.fullName, text.cancelledSubject, text.cancelledBody(meetingWhen(meeting, proposal.language), need.title, occupant.name));
};

module.exports = {
  b2bMeetingScheduled,
  b2bMeetingCancelled,
  contactRequested,
  contactReminder,
  investorRequestReceived,
  b2bProposalReceived,
  studioInvitationAnswered,
  investorRequestConfirmation,
  b2bProposalConfirmation,
  b2bProposalDecision,
};
