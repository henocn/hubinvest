const { UniqueConstraintError } = require('sequelize');
const AppError = require('../../shared/app-error');
const investorRequestRepository = require('./investor-request.repository');
const notificationService = require('../notification/notification.service');
const { events: realtime } = require('../realtime/realtime.service');
const settingsService = require('../settings/settings.service');
const { slotGrid } = require('../../shared/slot-grid');
const { guichetLocation } = require('../../shared/guichets');
const { SERVICES, SERVICE_KEYS } = require('../../shared/services');
const { renderDiagnosisPdf, reference } = require('./diagnosis-pdf');

// Les guichets et le registre unique (document v4, M3). Les données restent réservées à l'API-ZF (super administrateurs).
const plain = (value) => (value?.toJSON ? value.toJSON() : value);

// Statut calculé, jamais saisi :
// - Accompagnement : « À traiter » sans engagement, « À suivre » tant que l'engagement court, « Terminé » une fois la réponse donnée ;
// - autres contacts : « À traiter » tant que rien n'est fait, « À relancer » tant qu'une relance reste à faire,
//   « Terminé » quand le contact est classé ou relancé sans relance restant à faire.
const progressStatus = ({ nextFollowUpAt, classification, commitmentDueAt, resolvedAt }, hasFollowUps) => {
  if (classification === 'support') {
    if (resolvedAt) return 'closed';
    return commitmentDueAt ? 'in_progress' : 'new';
  }
  if (nextFollowUpAt) return 'in_progress';
  return classification || hasFollowUps ? 'closed' : 'new';
};

// Recalcule le statut et la prochaine relance (la plus proche des relances à faire, reprise dans la liste et le tableau
// de bord) après une modification.
const refreshStatus = async (investorRequest) => {
  const pending = await investorRequestRepository.findPendingFollowUps(investorRequest.id);
  const hasFollowUps = pending.length > 0 || (await investorRequestRepository.countFollowUps(investorRequest.id)) > 0;
  const nextFollowUpAt = pending[0]?.dueAt || null;
  const { classification, commitmentDueAt, resolvedAt } = investorRequest;
  const status = progressStatus({ nextFollowUpAt, classification, commitmentDueAt, resolvedAt }, hasFollowUps);
  const changes = {};
  if (status !== investorRequest.status) changes.status = status;
  if (new Date(nextFollowUpAt || 0).getTime() !== new Date(investorRequest.nextFollowUpAt || 0).getTime()) changes.nextFollowUpAt = nextFollowUpAt;
  if (Object.keys(changes).length) await investorRequestRepository.update(investorRequest, changes);
  return investorRequest;
};

// Relances : à l'heure prévue, le responsable du contact (ou, sans responsable, l'équipe API-ZF) est notifié.
const scheduleFollowUps = (investorRequest, followUps) => followUps.forEach((item) => notificationService.investorFollowUpChanged(item, investorRequest));
const CLASS_SOURCES = ['A', 'B'];
const COMMITMENT_SOURCE = 'commitment';

// Retire les relances automatiques encore à faire de ces origines (une relance faite, ou ajoutée à la main, reste).
const removePendingAuto = async (investorRequest, sources) => {
  const previous = await investorRequestRepository.findPendingFollowUps(investorRequest.id, { sources });
  await Promise.all(previous.map(async (item) => {
    await investorRequestRepository.destroyFollowUp(item);
    notificationService.investorFollowUpRemoved(item);
  }));
};

// Classe A ou B : sa relance automatique (48 h ou 7 jours, réglables). Un changement de classe remplace la relance
// automatique de l'ancienne classe ; C et Accompagnement n'en ont pas.
const applyClassFollowUp = async (investorRequest, classification, userId = null) => {
  await removePendingAuto(investorRequest, CLASS_SOURCES);
  const delay = settingsService.investorFollowUpDelay(classification);
  if (!delay) return null;
  return investorRequestRepository.createFollowUp({
    investorRequestId: investorRequest.id,
    dueAt: new Date(Date.now() + delay),
    reason: `Relance du contact classé ${classification}`,
    autoSource: classification,
    createdByUserId: userId,
  });
};

// Engagement de suivi : une relance le jour de la réponse promise, à 9 h (heure de Lomé = UTC). Un engagement modifié
// la remplace ; une réponse donnée, ou un engagement retiré, la retire.
const applyCommitmentFollowUp = async (investorRequest) => {
  await removePendingAuto(investorRequest, [COMMITMENT_SOURCE]);
  const { commitmentDueAt, commitmentNote, resolvedAt } = investorRequest;
  if (!commitmentDueAt || resolvedAt) return null;
  const dueAt = new Date(commitmentDueAt);
  dueAt.setUTCHours(9, 0, 0, 0);
  if (dueAt.getTime() <= Date.now()) return null;
  return investorRequestRepository.createFollowUp({
    investorRequestId: investorRequest.id,
    dueAt,
    reason: `Réponse promise : ${commitmentNote}`.slice(0, 255),
    autoSource: COMMITMENT_SOURCE,
  });
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

// Fiche : coordonnées, guichet, classe et responsable ; le statut suit. La classe A ou B crée sa relance automatique,
// remplacée si la classe change. Un nouveau responsable reçoit les alertes des relances encore à faire.
const update = async (id, values) => {
  const investorRequest = await getRequest(id);
  const next = { ...values };
  if (next.organization === '') next.organization = null;
  if (next.phone === '') next.phone = null;
  if (next.email) next.email = next.email.toLowerCase();
  if ('contactUserId' in next) await assertTeamMember(next.contactUserId);
  const classChanged = 'classification' in next && next.classification !== investorRequest.classification;
  await investorRequestRepository.update(investorRequest, next);
  const created = classChanged ? await applyClassFollowUp(investorRequest, next.classification) : null;
  await refreshStatus(investorRequest);
  const updated = await getRequest(id);
  if ('contactUserId' in next) scheduleFollowUps(updated, await investorRequestRepository.findPendingFollowUps(updated.id));
  else if (created) scheduleFollowUps(updated, [created]);
  realtime.investorRequestsChanged();
  return updated;
};

// Fiche de diagnostic (15 minutes) : les neuf informations, le service vers lequel la personne est orientée et l'étape
// suivante, obligatoire (« Personne ne repart sans étape suivante »). La première saisie compte comme diagnostic réalisé.
// La structure et le projet, que la réservation en ligne ne demande pas, se renseignent pendant l'entretien.
const saveDiagnosis = async (id, { organization, projectSummary, qualification, recommendedService = null, nextAction }) => {
  const investorRequest = await getRequest(id);
  assertService(recommendedService);
  await investorRequestRepository.update(investorRequest, {
    ...(organization !== undefined && { organization: organization || null }),
    ...(projectSummary !== undefined && { projectSummary: projectSummary || null }),
    qualification: cleanQualification(qualification),
    recommendedService,
    nextAction,
    diagnosedAt: investorRequest.diagnosedAt || new Date(),
  });
  realtime.investorRequestsChanged();
  return getRequest(id);
};

// Fiche de diagnostic imprimable (PDF), disponible une fois le diagnostic enregistré.
const diagnosisPdf = async (id) => {
  const investorRequest = await investorRequestRepository.findById(id);
  if (!investorRequest) throw new AppError(404, 'INVESTOR_REQUEST_NOT_FOUND', 'Contact introuvable.');
  if (!investorRequest.diagnosedAt) throw new AppError(409, 'DIAGNOSIS_MISSING', 'Enregistrez d’abord le diagnostic.');
  const request = plain(investorRequest);
  const buffer = await renderDiagnosisPdf({ request, fields: settingsService.investorQualificationFields() });
  return { buffer, fileName: `fiche-diagnostic-${reference(request)}.pdf` };
};

// Fiche « Mon entreprise, mes difficultés » et engagement de suivi écrit (service concerné, réponse promise, délai).
// Le contact passe en Accompagnement ; l'engagement est noté sur la fiche, le responsable est alerté à l'échéance.
const saveDifficulty = async (id, { difficulty, commitmentService = null, commitmentDueAt = null, commitmentNote = null }) => {
  const investorRequest = await getRequest(id);
  assertService(commitmentService);
  if (commitmentDueAt && new Date(commitmentDueAt).getTime() <= Date.now()) throw new AppError(422, 'COMMITMENT_DUE_IN_PAST', 'Choisissez un délai à venir.');
  if (Boolean(commitmentDueAt) !== Boolean(commitmentNote)) throw new AppError(422, 'COMMITMENT_INCOMPLETE', 'L’engagement demande un texte et un délai de réponse.');
  const commitmentChanged = (commitmentNote || null) !== (investorRequest.commitmentNote || null)
    || new Date(commitmentDueAt || 0).getTime() !== new Date(investorRequest.commitmentDueAt || 0).getTime()
    || (commitmentService || null) !== (investorRequest.commitmentService || null);
  if (commitmentChanged && investorRequest.resolvedAt) throw new AppError(409, 'COMMITMENT_LOCKED', 'Réponse donnée : rouvrez l’engagement pour le modifier.');
  const classChanged = investorRequest.classification !== 'support';
  await investorRequestRepository.update(investorRequest, {
    difficulty,
    classification: 'support',
    commitmentService,
    commitmentDueAt,
    commitmentNote,
  });
  if (classChanged) await applyClassFollowUp(investorRequest, 'support');
  const created = commitmentChanged ? await applyCommitmentFollowUp(investorRequest) : null;
  await refreshStatus(investorRequest);
  const updated = await getRequest(id);
  if (created) scheduleFollowUps(updated, [created]);
  realtime.investorRequestsChanged();
  return updated;
};

// Réponse apportée à l'entreprise : l'engagement est tenu, sa relance est marquée faite et le contact est terminé.
// Rouvrir l'engagement recrée sa relance si la date promise est encore à venir.
const resolve = async (id, { resolved }) => {
  const investorRequest = await getRequest(id);
  if (investorRequest.classification !== 'support' || !investorRequest.commitmentDueAt) {
    throw new AppError(409, 'COMMITMENT_MISSING', 'Aucun engagement de suivi n’est en cours.');
  }
  await investorRequestRepository.update(investorRequest, { resolvedAt: resolved ? new Date() : null });
  let created = null;
  if (resolved) {
    const pending = await investorRequestRepository.findPendingFollowUps(investorRequest.id, { sources: [COMMITMENT_SOURCE] });
    await Promise.all(pending.map(async (item) => {
      await investorRequestRepository.updateFollowUp(item, { doneAt: new Date(), outcome: 'closed', outcomeNote: 'Réponse donnée' });
      notificationService.investorFollowUpRemoved(item);
    }));
  } else {
    created = await applyCommitmentFollowUp(investorRequest);
  }
  await refreshStatus(investorRequest);
  const updated = await getRequest(id);
  if (created) scheduleFollowUps(updated, [created]);
  realtime.investorRequestsChanged();
  return updated;
};

// Ajouter une relance : quand (date et heure à venir) et pourquoi. Elle reste à faire jusqu'à ce qu'on la marque faite.
const assertFollowUpFuture = (dueAt) => {
  if (new Date(dueAt).getTime() <= Date.now()) throw new AppError(422, 'INVESTOR_FOLLOW_UP_IN_PAST', 'Choisissez une date et une heure à venir.');
};

const addFollowUp = async (user, id, { dueAt, reason }) => {
  const investorRequest = await getRequest(id);
  assertFollowUpFuture(dueAt);
  const followUp = await investorRequestRepository.createFollowUp({ investorRequestId: investorRequest.id, dueAt, reason, createdByUserId: user.id });
  await refreshStatus(investorRequest);
  scheduleFollowUps(investorRequest, [followUp]);
  realtime.investorRequestsChanged();
  return followUp;
};

const getFollowUp = async (id, followUpId) => {
  const investorRequest = await getRequest(id);
  const followUp = await investorRequestRepository.findFollowUp(followUpId, investorRequest.id);
  if (!followUp) throw new AppError(404, 'INVESTOR_FOLLOW_UP_NOT_FOUND', 'Relance introuvable.');
  return { investorRequest, followUp };
};

// Marquer une relance faite, avec la prochaine étape : terminée, relancer (la relance suivante est créée) ou autre, et un
// commentaire (obligatoire pour « autre »).
const completeFollowUp = async (user, id, followUpId, { outcome, note = null, next = null }) => {
  const { investorRequest, followUp } = await getFollowUp(id, followUpId);
  if (followUp.doneAt) throw new AppError(409, 'INVESTOR_FOLLOW_UP_DONE', 'Cette relance est déjà faite.');
  if (outcome === 'again') assertFollowUpFuture(next.dueAt);
  await investorRequestRepository.updateFollowUp(followUp, { doneAt: new Date(), outcome, outcomeNote: note || null });
  notificationService.investorFollowUpRemoved(followUp);
  const created = outcome === 'again'
    ? await investorRequestRepository.createFollowUp({ investorRequestId: investorRequest.id, dueAt: next.dueAt, reason: next.reason, createdByUserId: user.id })
    : null;
  await refreshStatus(investorRequest);
  if (created) scheduleFollowUps(investorRequest, [created]);
  realtime.investorRequestsChanged();
  return followUp;
};

// Supprimer une relance (faite ou non) : son alerte disparaît.
const removeFollowUp = async (id, followUpId) => {
  const { investorRequest, followUp } = await getFollowUp(id, followUpId);
  await investorRequestRepository.destroyFollowUp(followUp);
  notificationService.investorFollowUpRemoved(followUp);
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
  diagnosisPdf,
  saveDifficulty,
  resolve,
  addFollowUp,
  completeFollowUp,
  removeFollowUp,
  addMeeting,
  updateMeeting,
  setMeetingStatus,
  removeMeeting,
  cleanQualification,
  progressStatus,
  allSlots,
};
