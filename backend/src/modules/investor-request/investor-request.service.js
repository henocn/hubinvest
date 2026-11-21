const { UniqueConstraintError } = require('sequelize');
const AppError = require('../../shared/app-error');
const investorRequestRepository = require('./investor-request.repository');
const notificationService = require('../notification/notification.service');
const { events: realtime } = require('../realtime/realtime.service');
const settingsService = require('../settings/settings.service');
const { slotGrid } = require('../../shared/slot-grid');
const { guichetLocation } = require('../../shared/guichets');
const { SERVICES, SERVICE_KEYS, serviceTitle } = require('../../shared/services');

// Les guichets et le registre unique (document v4, M3). Les données restent réservées à l'API-ZF (super administrateurs).
const plain = (value) => (value?.toJSON ? value.toJSON() : value);

// Statut calculé, jamais saisi :
// - Accompagnement : « À traiter » sans engagement, « À suivre » tant que l'engagement court, « Terminé » une fois la réponse donnée ;
// - autres contacts : « À traiter » tant que rien n'est fait, « À relancer » dès qu'une prochaine relance est prévue,
//   « Terminé » quand le contact est classé ou relancé sans nouvelle relance prévue.
const progressStatus = ({ nextFollowUpAt, classification, commitmentDueAt, resolvedAt }, hasFollowUps) => {
  if (classification === 'support') {
    if (resolvedAt) return 'closed';
    return commitmentDueAt ? 'in_progress' : 'new';
  }
  if (nextFollowUpAt) return 'in_progress';
  return classification || hasFollowUps ? 'closed' : 'new';
};

// Recalcule le statut après une modification.
const refreshStatus = async (investorRequest) => {
  const hasFollowUps = (await investorRequestRepository.countFollowUps(investorRequest.id)) > 0;
  const status = progressStatus(investorRequest, hasFollowUps);
  if (status !== investorRequest.status) await investorRequestRepository.update(investorRequest, { status });
  return investorRequest;
};

const list = async (query) => {
  const result = await investorRequestRepository.findAll(query);
  return {
    items: result.rows,
    pagination: { total: result.count, limit: query.limit, offset: query.offset },
  };
};

const contactValues = (values) => ({
  fullName: values.fullName,
  email: values.email.toLowerCase(),
  phone: values.phone || null,
  organization: values.organization || null,
  guichet: values.guichet || 'project',
  projectSummary: values.projectSummary || null,
  status: 'new',
  nextAction: null,
});

// « Être recontacté » : la personne laisse ses coordonnées et la question qui la concerne ; l'équipe la rappelle.
const createPublic = async (values, language = 'fr') => {
  settingsService.assertOpen('investorDeskOpen');
  const investorRequest = await investorRequestRepository.create({
    ...contactValues(values),
    source: 'callback',
    language,
    consentApizf: true,
    consentCapturedAt: new Date(),
  });
  notificationService.investorRequestReceived(investorRequest);
  realtime.investorRequestsChanged();
  return investorRequest;
};

// Créneaux des guichets selon les réglages ; un créneau déjà réservé à ce guichet n'est plus proposé.
const allSlots = () => slotGrid(settingsService.guichetSchedule());

const publicSlots = async (guichet) => {
  settingsService.assertOpen('investorDeskOpen');
  const now = Date.now();
  const slots = allSlots().filter((start) => start > now);
  const { minutes } = settingsService.guichetSchedule();
  if (!slots.length) return { minutes, slots: [] };
  const booked = await investorRequestRepository.findGuichetMeetingsBetween(guichet, new Date(slots[0]), new Date(slots.at(-1) + 1));
  const taken = new Set(booked.map((meeting) => new Date(meeting.startsAt).getTime()));
  return { minutes, slots: slots.filter((start) => !taken.has(start)).map((start) => new Date(start).toISOString()) };
};

// « Prendre rendez-vous » : la personne choisit son guichet et un créneau libre ; elle reçoit la confirmation puis deux
// rappels. La base refuse une double réservation du même créneau au même guichet.
const book = async (values, language = 'fr') => {
  settingsService.assertOpen('investorDeskOpen');
  const start = new Date(values.startsAt).getTime();
  if (!allSlots().includes(start) || start <= Date.now()) throw new AppError(422, 'GUICHET_SLOT_INVALID', 'Ce créneau n’est pas proposé.');
  let created;
  try {
    created = await investorRequestRepository.createWithMeeting(
      { ...contactValues(values), source: 'online_booking', language, consentApizf: true, consentCapturedAt: new Date() },
      { startsAt: new Date(start), guichet: values.guichet, location: guichetLocation(values.guichet, language) },
    );
  } catch (error) {
    if (error instanceof UniqueConstraintError) throw new AppError(409, 'GUICHET_SLOT_TAKEN', 'Ce créneau vient d’être réservé. Choisissez-en un autre.');
    throw error;
  }
  const { investorRequest, meeting } = created;
  notificationService.investorRequestReceived(investorRequest);
  notificationService.investorMeetingChanged('scheduled', meeting, investorRequest);
  realtime.investorRequestsChanged();
  return { guichet: meeting.guichet, startsAt: meeting.startsAt, location: meeting.location, minutes: settingsService.guichetSchedule().minutes };
};

// Passage au guichet ou appel, saisi par l'équipe : pas de module à ouvrir ni d'e-mail.
const createManual = async (values) => {
  const investorRequest = await investorRequestRepository.create({
    ...contactValues(values),
    source: 'desk',
    language: 'fr',
    consentApizf: values.consentApizf,
    consentCapturedAt: new Date(),
  });
  realtime.investorRequestsChanged();
  return investorRequest;
};

const getRequest = async (id) => {
  const investorRequest = await investorRequestRepository.findById(id);
  if (!investorRequest) throw new AppError(404, 'INVESTOR_REQUEST_NOT_FOUND', 'Contact introuvable.');
  return investorRequest;
};

// La fiche complète, avec les informations de qualification, les services (orientation, engagement) et l'équipe API-ZF.
const detail = async (id) => {
  const investorRequest = await investorRequestRepository.findDetail(id);
  if (!investorRequest) throw new AppError(404, 'INVESTOR_REQUEST_NOT_FOUND', 'Contact introuvable.');
  const team = await investorRequestRepository.findTeam();
  return {
    ...plain(investorRequest),
    qualificationFields: settingsService.investorQualificationFields(),
    team: team.map(plain),
    services: SERVICES.map(({ key, title }) => ({ key, title })),
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

const assertTeamMember = async (userId) => {
  if (userId && !(await investorRequestRepository.findTeamMember(userId))) {
    throw new AppError(422, 'INVESTOR_CONTACT_INVALID', 'Le responsable doit être un membre actif de l’équipe API-ZF.');
  }
};

const assertService = (key) => {
  if (key && !SERVICE_KEYS.includes(key)) throw new AppError(422, 'SERVICE_NOT_FOUND', 'Service introuvable.');
};

// Fiche : coordonnées, guichet, classe et responsable ; le statut suit. Une première classe A ou B fixe la date de relance
// (48 h ou 7 jours, réglables) ; C et Accompagnement n'ont pas de relance individuelle. Une relance déjà faite garde sa date.
const update = async (id, values) => {
  const investorRequest = await getRequest(id);
  const next = { ...values };
  if (next.organization === '') next.organization = null;
  if (next.phone === '') next.phone = null;
  if (next.email) next.email = next.email.toLowerCase();
  if ('contactUserId' in next) await assertTeamMember(next.contactUserId);
  if ('classification' in next && next.classification !== investorRequest.classification) {
    const delay = settingsService.investorFollowUpDelay(next.classification);
    if (!delay) next.nextFollowUpAt = null;
    else if (!(await investorRequestRepository.countFollowUps(investorRequest.id))) next.nextFollowUpAt = new Date(Date.now() + delay);
  }
  await investorRequestRepository.update(investorRequest, next);
  await refreshStatus(investorRequest);
  const updated = await getRequest(id);
  notificationService.investorFollowUpChanged(updated);
  if ('contactUserId' in next && updated.classification === 'support') notificationService.investorCommitmentChanged(updated);
  realtime.investorRequestsChanged();
  return updated;
};

// Fiche de diagnostic (15 minutes) : les neuf informations, le service vers lequel la personne est orientée et l'étape
// suivante, obligatoire (« Personne ne repart sans étape suivante »). La première saisie compte comme diagnostic réalisé.
const saveDiagnosis = async (id, { qualification, recommendedService = null, nextAction }) => {
  const investorRequest = await getRequest(id);
  assertService(recommendedService);
  await investorRequestRepository.update(investorRequest, {
    qualification: cleanQualification(qualification),
    recommendedService,
    nextAction,
    diagnosedAt: investorRequest.diagnosedAt || new Date(),
  });
  realtime.investorRequestsChanged();
  return getRequest(id);
};

// Fiche « Mon entreprise, mes difficultés » et engagement de suivi écrit (service concerné, réponse promise, délai).
// Le contact passe en Accompagnement ; l'engagement est envoyé à l'entreprise s'il est nouveau ou modifié.
const saveDifficulty = async (id, { difficulty, commitmentService = null, commitmentDueAt = null, commitmentNote = null }) => {
  const investorRequest = await getRequest(id);
  assertService(commitmentService);
  if (commitmentDueAt && new Date(commitmentDueAt).getTime() <= Date.now()) throw new AppError(422, 'COMMITMENT_DUE_IN_PAST', 'Choisissez un délai à venir.');
  if (Boolean(commitmentDueAt) !== Boolean(commitmentNote)) throw new AppError(422, 'COMMITMENT_INCOMPLETE', 'L’engagement demande un texte et un délai de réponse.');
  const commitmentChanged = Boolean(commitmentNote) && (commitmentNote !== investorRequest.commitmentNote
    || new Date(commitmentDueAt).getTime() !== new Date(investorRequest.commitmentDueAt || 0).getTime()
    || commitmentService !== investorRequest.commitmentService);
  await investorRequestRepository.update(investorRequest, {
    difficulty,
    classification: 'support',
    nextFollowUpAt: null,
    commitmentService,
    commitmentDueAt,
    commitmentNote,
    ...(commitmentChanged && { resolvedAt: null }),
  });
  await refreshStatus(investorRequest);
  const updated = await getRequest(id);
  notificationService.investorFollowUpChanged(updated);
  notificationService.investorCommitmentChanged(updated, { notifyCompany: commitmentChanged, serviceTitle: serviceTitle(commitmentService, updated.language) });
  realtime.investorRequestsChanged();
  return updated;
};

// Réponse apportée à l'entreprise : l'engagement est tenu, le contact est terminé et l'alerte retirée.
const resolve = async (id, { resolved }) => {
  const investorRequest = await getRequest(id);
  if (investorRequest.classification !== 'support' || !investorRequest.commitmentDueAt) {
    throw new AppError(409, 'COMMITMENT_MISSING', 'Aucun engagement de suivi n’est en cours.');
  }
  await investorRequestRepository.update(investorRequest, { resolvedAt: resolved ? new Date() : null });
  await refreshStatus(investorRequest);
  const updated = await getRequest(id);
  notificationService.investorCommitmentChanged(updated);
  realtime.investorRequestsChanged();
  return updated;
};

// Relance faite (appel ou message). Pour un contact A ou B, l'étape suivante est obligatoire.
// La prochaine relance prend la date donnée, ou aucune.
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
  });
  await refreshStatus(investorRequest);
  notificationService.investorFollowUpChanged(await getRequest(id));
  realtime.investorRequestsChanged();
  return followUp;
};

const removeFollowUp = async (id, followUpId) => {
  const investorRequest = await getRequest(id);
  const followUp = await investorRequestRepository.findFollowUp(followUpId, investorRequest.id);
  if (!followUp) throw new AppError(404, 'INVESTOR_FOLLOW_UP_NOT_FOUND', 'Relance introuvable.');
  await investorRequestRepository.destroyFollowUp(followUp);
  await refreshStatus(investorRequest);
  realtime.investorRequestsChanged();
};

const assertFuture = (startsAt) => {
  if (new Date(startsAt).getTime() <= Date.now()) throw new AppError(422, 'INVESTOR_MEETING_IN_PAST', 'Choisissez une date à venir.');
};

// Un rendez-vous « au guichet » occupe le créneau du guichet de la personne ; ailleurs, le lieu est libre.
const meetingValues = (investorRequest, { startsAt, location, atGuichet }) => (atGuichet
  ? { startsAt, guichet: investorRequest.guichet, location: guichetLocation(investorRequest.guichet, investorRequest.language) }
  : { startsAt, guichet: null, location });

const saveMeeting = async (work) => {
  try {
    return await work();
  } catch (error) {
    if (error instanceof UniqueConstraintError) throw new AppError(409, 'GUICHET_SLOT_TAKEN', 'Ce créneau est déjà réservé à ce guichet.');
    throw error;
  }
};

// Rendez-vous avec la personne : elle reçoit la date, l'heure et le lieu par e-mail, puis tout changement et deux rappels.
const addMeeting = async (user, id, values) => {
  const investorRequest = await getRequest(id);
  assertFuture(values.startsAt);
  const meeting = await saveMeeting(() => investorRequestRepository.createMeeting({
    investorRequestId: investorRequest.id,
    ...meetingValues(investorRequest, values),
    createdByUserId: user.id,
  }));
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

const assertScheduled = (meeting) => {
  if (meeting.status !== 'scheduled') throw new AppError(409, 'INVESTOR_MEETING_CLOSED', 'Ce rendez-vous est déjà tenu ou annulé.');
};

// Modifier : seulement un rendez-vous prévu ; la personne reçoit la nouvelle date.
const updateMeeting = async (id, meetingId, values) => {
  const { investorRequest, meeting } = await getMeeting(id, meetingId);
  assertScheduled(meeting);
  assertFuture(values.startsAt);
  await saveMeeting(() => investorRequestRepository.updateMeeting(meeting, meetingValues(investorRequest, values)));
  notificationService.investorMeetingChanged('moved', meeting, investorRequest);
  realtime.investorRequestsChanged();
  return meeting;
};

// Valider (le rendez-vous a eu lieu, une fois son heure passée) ou annuler (la personne est prévenue par e-mail).
const setMeetingStatus = async (id, meetingId, status) => {
  const { investorRequest, meeting } = await getMeeting(id, meetingId);
  assertScheduled(meeting);
  if (status === 'held' && new Date(meeting.startsAt).getTime() > Date.now()) {
    throw new AppError(409, 'INVESTOR_MEETING_NOT_STARTED', 'Un rendez-vous se valide une fois son heure passée.');
  }
  await investorRequestRepository.updateMeeting(meeting, { status });
  if (status === 'cancelled' && new Date(meeting.startsAt).getTime() > Date.now()) notificationService.investorMeetingChanged('cancelled', meeting, investorRequest);
  else notificationService.investorMeetingRemoved(meeting);
  realtime.investorRequestsChanged();
  return meeting;
};

// Supprimer efface le rendez-vous (erreur de saisie) sans prévenir la personne : pour le décommander, on l'annule.
const removeMeeting = async (id, meetingId) => {
  const { meeting } = await getMeeting(id, meetingId);
  await investorRequestRepository.destroyMeeting(meeting);
  notificationService.investorMeetingRemoved(meeting);
  realtime.investorRequestsChanged();
};

module.exports = {
  list,
  createPublic,
  publicSlots,
  book,
  createManual,
  detail,
  update,
  saveDiagnosis,
  saveDifficulty,
  resolve,
  addFollowUp,
  removeFollowUp,
  addMeeting,
  updateMeeting,
  setMeetingStatus,
  removeMeeting,
  cleanQualification,
  progressStatus,
  allSlots,
};
