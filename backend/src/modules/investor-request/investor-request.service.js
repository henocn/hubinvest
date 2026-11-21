const AppError = require('../../shared/app-error');
const investorRequestRepository = require('./investor-request.repository');
const notificationService = require('../notification/notification.service');
const { events: realtime } = require('../realtime/realtime.service');
const settingsService = require('../settings/settings.service');

const plain = (value) => (value?.toJSON ? value.toJSON() : value);

// Statut calculé, jamais saisi : « À traiter » (new) tant que rien n'est fait, « À relancer » (in_progress) dès qu'une
// prochaine relance est prévue, « Terminé » (closed) quand la demande est classée ou relancée sans nouvelle relance prévue.
const progressStatus = ({ nextFollowUpAt, classification }, hasFollowUps) => {
  if (nextFollowUpAt) return 'in_progress';
  return classification || hasFollowUps ? 'closed' : 'new';
};

// L'Investor Desk est le guichet de l'API-ZF : toutes les demandes lui reviennent, aucune n'est rattachée à un stand.
const list = async (query) => {
  const result = await investorRequestRepository.findAll(query);
  return {
    items: result.rows,
    pagination: {
      total: result.count,
      limit: query.limit,
      offset: query.offset,
    },
  };
};

const createPublic = async (values, language = 'fr') => {
  settingsService.assertOpen('investorDeskOpen');
  const investorRequest = await investorRequestRepository.create({
    fullName: values.fullName,
    email: values.email.toLowerCase(),
    phone: values.phone || null,
    projectSummary: values.projectSummary,
    status: 'new',
    nextAction: null,
    language,
    consentApizf: true,
    consentCapturedAt: new Date(),
  });
  notificationService.investorRequestReceived(investorRequest);
  realtime.investorRequestsChanged();
  return investorRequest;
};

// Demande saisie dans le back office (rencontre au guichet, appel…) : pas de module à ouvrir ni de notification.
const createManual = async (values) => {
  const investorRequest = await investorRequestRepository.create({
    fullName: values.fullName,
    email: values.email.toLowerCase(),
    phone: values.phone || null,
    projectSummary: values.projectSummary,
    status: 'new',
    nextAction: null,
    language: 'fr',
    consentApizf: values.consentApizf,
    consentCapturedAt: new Date(),
  });
  realtime.investorRequestsChanged();
  return investorRequest;
};

const getRequest = async (id) => {
  const investorRequest = await investorRequestRepository.findById(id);
  if (!investorRequest) throw new AppError(404, 'INVESTOR_REQUEST_NOT_FOUND', 'Demande introuvable.');
  return investorRequest;
};

// La fiche complète, avec les informations de qualification à remplir et l'équipe qui peut être interlocuteur.
const detail = async (id) => {
  const investorRequest = await investorRequestRepository.findDetail(id);
  if (!investorRequest) throw new AppError(404, 'INVESTOR_REQUEST_NOT_FOUND', 'Demande introuvable.');
  return {
    ...plain(investorRequest),
    qualificationFields: settingsService.investorQualificationFields(),
    team: (await investorRequestRepository.findTeam()).map(plain),
  };
};

// Ne garde que les réponses aux informations réglées, sans valeur vide.
const cleanQualification = (answers) => {
  const fields = settingsService.investorQualificationFields();
  const cleaned = {};
  fields.forEach((field) => {
    const value = answers?.[field.key];
    if (value === undefined || value === null || value === '') return;
    if (field.type === 'number') {
      const number = Number(value);
      if (Number.isFinite(number)) cleaned[field.key] = number;
    } else if (field.type === 'yesno') {
      cleaned[field.key] = value === true || value === 'yes';
    } else {
      cleaned[field.key] = String(value).trim().slice(0, 500);
    }
  });
  return cleaned;
};

// Suivi : classe, qualification et interlocuteur ; le statut suit. Une première classe A ou B fixe la date de relance
// (48 h ou 7 jours, réglables) ; C n'a pas de relance individuelle. Une relance déjà faite garde sa propre date.
const update = async (id, values) => {
  const investorRequest = await getRequest(id);
  const next = { ...values };
  if (next.nextAction === '') next.nextAction = null;
  if ('contactUserId' in next && next.contactUserId) {
    if (!(await investorRequestRepository.findTeamMember(next.contactUserId))) {
      throw new AppError(422, 'INVESTOR_CONTACT_INVALID', 'L’interlocuteur doit être un membre actif de l’équipe API-ZF.');
    }
  }
  if ('qualification' in next) next.qualification = cleanQualification(next.qualification);
  if ('classification' in next && next.classification !== investorRequest.classification) {
    const delay = settingsService.investorFollowUpDelay(next.classification);
    if (!delay) next.nextFollowUpAt = null;
    else if (!(await investorRequestRepository.countFollowUps(investorRequest.id))) next.nextFollowUpAt = new Date(Date.now() + delay);
  }
  const hasFollowUps = (await investorRequestRepository.countFollowUps(investorRequest.id)) > 0;
  next.status = progressStatus({
    nextFollowUpAt: 'nextFollowUpAt' in next ? next.nextFollowUpAt : investorRequest.nextFollowUpAt,
    classification: 'classification' in next ? next.classification : investorRequest.classification,
  }, hasFollowUps);
  await investorRequestRepository.update(investorRequest, next);
  const updated = await getRequest(id);
  notificationService.investorFollowUpChanged(updated);
  realtime.investorRequestsChanged();
  return updated;
};

// Relance faite (appel ou message). Pour un contact A ou B, l'étape suivante est obligatoire :
// « Personne ne repart sans étape suivante ». La prochaine relance prend la date donnée, ou aucune.
const addFollowUp = async (user, id, values) => {
  const investorRequest = await getRequest(id);
  if (['A', 'B'].includes(investorRequest.classification) && !values.nextStep) {
    throw new AppError(422, 'INVESTOR_NEXT_STEP_REQUIRED', 'Contact A ou B : indiquez l’étape suivante.');
  }
  const followUp = await investorRequestRepository.createFollowUp({
    investorRequestId: investorRequest.id,
    doneAt: values.doneAt || new Date(),
    channel: values.channel,
    note: values.note || null,
    nextStep: values.nextStep || null,
    createdByUserId: user.id,
  });
  await investorRequestRepository.update(investorRequest, {
    nextAction: values.nextStep || investorRequest.nextAction,
    nextFollowUpAt: values.nextFollowUpAt || null,
    status: progressStatus({ nextFollowUpAt: values.nextFollowUpAt || null, classification: investorRequest.classification }, true),
  });
  notificationService.investorFollowUpChanged(await getRequest(id));
  realtime.investorRequestsChanged();
  return followUp;
};

const removeFollowUp = async (id, followUpId) => {
  const investorRequest = await getRequest(id);
  const followUp = await investorRequestRepository.findFollowUp(followUpId, investorRequest.id);
  if (!followUp) throw new AppError(404, 'INVESTOR_FOLLOW_UP_NOT_FOUND', 'Relance introuvable.');
  await investorRequestRepository.destroyFollowUp(followUp);
  const hasFollowUps = (await investorRequestRepository.countFollowUps(investorRequest.id)) > 0;
  await investorRequestRepository.update(investorRequest, { status: progressStatus(investorRequest, hasFollowUps) });
  realtime.investorRequestsChanged();
};

// Rendez-vous avec l'investisseur : il reçoit la date, l'heure et le lieu par e-mail, puis tout changement.
const addMeeting = async (user, id, { startsAt, location }) => {
  const investorRequest = await getRequest(id);
  if (new Date(startsAt).getTime() <= Date.now()) throw new AppError(422, 'INVESTOR_MEETING_IN_PAST', 'Choisissez une date à venir.');
  const meeting = await investorRequestRepository.createMeeting({ investorRequestId: investorRequest.id, startsAt, location, createdByUserId: user.id });
  notificationService.investorMeetingChanged('scheduled', meeting, investorRequest);
  realtime.investorRequestsChanged();
  return meeting;
};

const getMeeting = async (id, meetingId) => {
  const investorRequest = await getRequest(id);
  const meeting = await investorRequestRepository.findMeeting(meetingId, investorRequest.id);
  if (!meeting) throw new AppError(404, 'INVESTOR_MEETING_NOT_FOUND', 'Rendez-vous introuvable.');
  return { investorRequest, meeting };
};

const updateMeeting = async (id, meetingId, { startsAt, location }) => {
  const { investorRequest, meeting } = await getMeeting(id, meetingId);
  if (new Date(startsAt).getTime() <= Date.now()) throw new AppError(422, 'INVESTOR_MEETING_IN_PAST', 'Choisissez une date à venir.');
  await investorRequestRepository.updateMeeting(meeting, { startsAt, location });
  notificationService.investorMeetingChanged('moved', meeting, investorRequest);
  realtime.investorRequestsChanged();
  return meeting;
};

const removeMeeting = async (id, meetingId) => {
  const { investorRequest, meeting } = await getMeeting(id, meetingId);
  await investorRequestRepository.destroyMeeting(meeting);
  if (new Date(meeting.startsAt).getTime() > Date.now()) notificationService.investorMeetingChanged('cancelled', meeting, investorRequest);
  realtime.investorRequestsChanged();
};

module.exports = {
  list,
  createPublic,
  createManual,
  detail,
  update,
  addFollowUp,
  removeFollowUp,
  addMeeting,
  updateMeeting,
  removeMeeting,
  cleanQualification,
  progressStatus,
};
