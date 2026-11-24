const AppError = require('../../shared/app-error');
const liveQuestionRepository = require('./live-question.repository');
const settingsService = require('../settings/settings.service');
const { events: realtime } = require('../realtime/realtime.service');
const notificationService = require('../notification/notification.service');

// Directs ouverts aux questions : émission du Studio, prise de parole, temps fort.
const LIVE_TYPES = new Set(['studio', 'talk', 'highlight']);
// Sans heure de fin, un direct reste ouvert deux heures ; avec une heure de fin, dix minutes de plus pour les retardataires.
const DEFAULT_DURATION = 2 * 60 * 60 * 1000;
const GRACE = 10 * 60 * 1000;

const isLive = (event, now = new Date()) => {
  if (!event || !LIVE_TYPES.has(event.type)) return false;
  const start = new Date(event.startsAt).getTime();
  const end = event.endsAt ? new Date(event.endsAt).getTime() + GRACE : start + DEFAULT_DURATION;
  return now.getTime() >= start && now.getTime() <= end;
};

// Le public envoie sa question pendant le direct ; l'animateur la reçoit aussitôt.
const createPublic = async (eventId, values, now = new Date()) => {
  settingsService.assertOpen('liveQuestionsOpen');
  const event = await liveQuestionRepository.findEvent(eventId);
  if (!event) throw new AppError(404, 'PROGRAM_EVENT_NOT_FOUND', 'Ce rendez-vous n’existe plus.');
  if (!isLive(event, now)) throw new AppError(409, 'LIVE_NOT_OPEN', 'Les questions ne sont ouvertes que pendant le direct.');
  const created = await liveQuestionRepository.create({
    programEventId: event.id,
    authorName: values.authorName || null,
    question: values.question,
    status: 'new',
  });
  realtime.liveQuestionsChanged();
  notificationService.liveQuestionReceived(created, event);
  return { id: created.id };
};

const serialize = (question) => {
  const values = question.toJSON ? question.toJSON() : question;
  return {
    id: values.id,
    question: values.question,
    authorName: values.authorName,
    status: values.status,
    createdAt: values.createdAt,
    handledAt: values.handledAt,
    handledBy: values.handledBy ? { firstName: values.handledBy.firstName, lastName: values.handledBy.lastName } : null,
    event: values.event ? {
      id: values.event.id,
      type: values.event.type,
      title: values.event.title || values.event.occupant?.name || '',
      location: values.event.location,
      startsAt: values.event.startsAt,
      endsAt: values.event.endsAt,
      live: isLive(values.event),
    } : null,
  };
};

// Questions des dernières 24 heures, les plus récentes d'abord.
const list = async (now = new Date()) => (await liveQuestionRepository.findSince(new Date(now.getTime() - 24 * 60 * 60 * 1000))).map(serialize);

// L'animateur marque la question posée, écartée, ou la remet à poser.
const updateStatus = async (user, id, status) => {
  const question = await liveQuestionRepository.findById(id);
  if (!question) throw new AppError(404, 'LIVE_QUESTION_NOT_FOUND', 'Question introuvable.');
  await liveQuestionRepository.update(question, {
    status,
    handledByUserId: status === 'new' ? null : user.id,
    handledAt: status === 'new' ? null : new Date(),
  });
  realtime.liveQuestionsChanged();
  return { id: question.id, status };
};

module.exports = { isLive, createPublic, list, updateStatus };
