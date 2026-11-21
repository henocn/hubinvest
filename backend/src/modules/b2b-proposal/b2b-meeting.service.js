const AppError = require('../../shared/app-error');
const b2bProposalService = require('./b2b-proposal.service');
const b2bMeetingRepository = require('./b2b-meeting.repository');
const notificationService = require('../notification/notification.service');
const { events: realtime } = require('../realtime/realtime.service');
const settingsService = require('../settings/settings.service');

// Rencontre B2B (document, module M4) : une demande acceptée reçoit un rendez-vous sur une table,
// puis un compte rendu en un clic. Heures de Lomé = UTC, sans heure d'été.
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

const toMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Deux rendez-vous se chevauchent si chacun commence avant la fin de l'autre.
const overlaps = (aStart, aMinutes, bStart, bMinutes) => aStart < bStart + bMinutes * MINUTE && bStart < aStart + aMinutes * MINUTE;

// Rendez-vous déjà fixés qui chevauchent le créneau [start, start + minutes).
const overlapping = async (start, minutes, transaction) => (await b2bMeetingRepository.findStartingBetween(
  new Date(start - DAY),
  new Date(start + minutes * MINUTE),
  transaction,
)).filter((meeting) => overlaps(new Date(meeting.startsAt).getTime(), meeting.durationMinutes, start, minutes));

const plain = (value) => (value?.toJSON ? value.toJSON() : value);

// La demande avec ses rendez-vous et les réglages des tables, pour la page de détail.
const detail = async (user, id) => {
  const proposal = await b2bProposalService.getManaged(user, id);
  const meetings = await b2bMeetingRepository.findByProposal(proposal.id);
  return { ...plain(proposal), meetings: meetings.map(plain), schedule: settingsService.b2bSchedule() };
};

// Créneaux encore libres un jour donné : le stand doit être libre et au moins une table aussi.
// « excludeId » = le rendez-vous qu'on déplace : sa place actuelle compte comme libre.
const slots = async (user, id, date, excludeId = null) => {
  const proposal = await b2bProposalService.getManaged(user, id);
  const { tables, minutes, dayStart, dayEnd } = settingsService.b2bSchedule();
  const day = Date.parse(`${date}T00:00:00Z`);
  const first = day + toMinutes(dayStart) * MINUTE;
  const last = day + toMinutes(dayEnd) * MINUTE;
  const existing = (await b2bMeetingRepository.findStartingBetween(new Date(day - DAY), new Date(last))).filter((meeting) => meeting.id !== excludeId);
  const standId = proposal.need.occupantId;
  const now = Date.now();
  const free = [];
  for (let start = first; start + minutes * MINUTE <= last; start += minutes * MINUTE) {
    if (start <= now) continue;
    const busy = existing.filter((meeting) => overlaps(new Date(meeting.startsAt).getTime(), meeting.durationMinutes, start, minutes));
    if (busy.some((meeting) => meeting.proposal.need.occupantId === standId)) continue;
    const taken = new Set(busy.map((meeting) => meeting.tableNumber));
    const openTables = Array.from({ length: tables }, (_value, index) => index + 1).filter((table) => !taken.has(table));
    if (openTables.length) free.push({ startsAt: new Date(start).toISOString(), tables: openTables });
  }
  return { date, minutes, tables, slots: free };
};

// Contrôles communs à un nouveau rendez-vous et à un déplacement : demande acceptée, table existante, créneau à venir.
const checkSlot = (proposal, { startsAt, tableNumber }) => {
  if (proposal.status !== 'accepted') throw new AppError(409, 'B2B_PROPOSAL_NOT_ACCEPTED', 'Acceptez la demande avant de fixer un rendez-vous.');
  const { tables, minutes } = settingsService.b2bSchedule();
  if (tableNumber > tables) throw new AppError(422, 'B2B_TABLE_UNKNOWN', `Il n’y a que ${tables} table${tables > 1 ? 's' : ''}.`);
  const start = new Date(startsAt).getTime();
  if (start <= Date.now()) throw new AppError(422, 'B2B_MEETING_IN_PAST', 'Choisissez un créneau à venir.');
  return { start, minutes };
};

// Sous verrou : la table et le stand doivent être libres sur le créneau (le rendez-vous déplacé ne se gêne pas lui-même).
const assertFree = async (proposal, { start, minutes, tableNumber }, transaction, ignoreId = null) => {
  await b2bMeetingRepository.lockSchedule(transaction);
  const busy = (await overlapping(start, minutes, transaction)).filter((item) => item.id !== ignoreId);
  if (busy.some((item) => item.tableNumber === tableNumber)) throw new AppError(409, 'B2B_TABLE_TAKEN', 'Cette table est déjà prise sur ce créneau.');
  if (busy.some((item) => item.proposal.need.occupantId === proposal.need.occupantId)) {
    throw new AppError(409, 'B2B_STAND_BUSY', 'Le stand a déjà un rendez-vous sur ce créneau.');
  }
};

// Fixe un rendez-vous : demande acceptée, créneau à venir, table existante et libre, stand libre.
// Un verrou de transaction évite que deux personnes prennent la même table au même moment.
const schedule = async (user, id, { startsAt, tableNumber }) => {
  const proposal = await b2bProposalService.getManaged(user, id);
  const { start, minutes } = checkSlot(proposal, { startsAt, tableNumber });

  const meeting = await b2bMeetingRepository.sequelize.transaction(async (transaction) => {
    await assertFree(proposal, { start, minutes, tableNumber }, transaction);
    return b2bMeetingRepository.create({
      b2bProposalId: proposal.id,
      startsAt: new Date(start),
      durationMinutes: minutes,
      tableNumber,
      createdByUserId: user.id,
    }, transaction);
  });
  notificationService.b2bMeetingScheduled(meeting, proposal);
  realtime.b2bChanged(proposal.need.occupantId);
  return plain(meeting);
};

const getMeeting = async (user, id, meetingId) => {
  const proposal = await b2bProposalService.getManaged(user, id);
  const meeting = await b2bMeetingRepository.findById(meetingId, proposal.id);
  if (!meeting) throw new AppError(404, 'B2B_MEETING_NOT_FOUND', 'Rendez-vous introuvable.');
  return { proposal, meeting };
};

// Déplace un rendez-vous (jour, heure, table) tant qu'il n'a pas de compte rendu ; le visiteur reçoit la nouvelle date.
const reschedule = async (user, id, meetingId, { startsAt, tableNumber }) => {
  const { proposal, meeting } = await getMeeting(user, id, meetingId);
  if (meeting.outcome) throw new AppError(409, 'B2B_MEETING_REPORTED', 'Ce rendez-vous a déjà son compte rendu : il ne peut plus être déplacé.');
  const { start, minutes } = checkSlot(proposal, { startsAt, tableNumber });
  await b2bMeetingRepository.sequelize.transaction(async (transaction) => {
    await assertFree(proposal, { start, minutes, tableNumber }, transaction, meeting.id);
    await b2bMeetingRepository.update(meeting, { startsAt: new Date(start), durationMinutes: minutes, tableNumber }, transaction);
  });
  notificationService.b2bMeetingMoved(meeting, proposal);
  realtime.b2bChanged(proposal.need.occupantId);
  return plain(meeting);
};

// Compte rendu en un clic (tenue avec suite, tenue sans suite, absent), une fois le rendez-vous commencé ;
// la note reste facultative et se modifie à tout moment. Une issue vide annule le compte rendu.
const report = async (user, id, meetingId, values) => {
  const { proposal, meeting } = await getMeeting(user, id, meetingId);
  const next = {};
  if ('outcome' in values) {
    if (values.outcome && new Date(meeting.startsAt).getTime() > Date.now()) {
      throw new AppError(409, 'B2B_MEETING_NOT_STARTED', 'Le compte rendu se fait une fois le rendez-vous commencé.');
    }
    next.outcome = values.outcome || null;
    next.reportedAt = values.outcome ? new Date() : null;
    next.reportedByUserId = values.outcome ? user.id : null;
  }
  if ('note' in values) next.note = values.note || null;
  await b2bMeetingRepository.update(meeting, next);
  realtime.b2bChanged(proposal.need.occupantId);
  return plain(await b2bMeetingRepository.findById(meeting.id, proposal.id));
};

// Annule un rendez-vous ; le visiteur est prévenu s'il n'avait pas encore eu lieu.
const cancel = async (user, id, meetingId) => {
  const { proposal, meeting } = await getMeeting(user, id, meetingId);
  await b2bMeetingRepository.destroy(meeting);
  if (new Date(meeting.startsAt).getTime() > Date.now()) notificationService.b2bMeetingCancelled(meeting, proposal);
  realtime.b2bChanged(proposal.need.occupantId);
};

module.exports = { detail, slots, schedule, reschedule, report, cancel, overlaps };
