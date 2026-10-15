const AppError = require('../../shared/app-error');
const { translatePublicContent } = require('../../shared/translation.service');
const programEventRepository = require('./program-event.repository');

const DAY_MS = 24 * 60 * 60 * 1000;
const UPCOMING_LIMIT = 4;

// Renvoie le début de la journée du Hub (Lomé est à UTC+0 toute l'année).
const startOfHubDay = (date) => {
  const day = new Date(date);
  day.setUTCHours(0, 0, 0, 0);
  return day;
};

// Retire les champs internes d'un élément avant de l'exposer au public.
const publicEvent = (event) => {
  const values = event.toJSON ? event.toJSON() : event;
  return {
    id: values.id,
    type: values.type,
    title: values.title,
    description: values.description,
    location: values.location,
    startsAt: values.startsAt,
    endsAt: values.endsAt,
    occupant: values.occupant || null,
  };
};

// Prépare le contenu de l'accueil : occupant à l'affiche, programme du jour et prochains rendez-vous.
const getToday = async (language, now = new Date()) => {
  const dayStart = startOfHubDay(now);
  const dayEnd = new Date(dayStart.getTime() + DAY_MS);
  const [spotlight, today, upcoming] = await Promise.all([
    programEventRepository.findPublicSpotlight(dayStart, dayEnd),
    programEventRepository.findPublicBetween(dayStart, dayEnd),
    programEventRepository.findPublicBetween(dayEnd, null, UPCOMING_LIMIT),
  ]);

  const eventPaths = ['title', 'description', 'location'];
  const [translatedSpotlight, translatedToday, translatedUpcoming] = await Promise.all([
    spotlight
      ? translatePublicContent(publicEvent(spotlight), [...eventPaths, 'occupant.activity'], language)
      : null,
    translatePublicContent(today.map(publicEvent), eventPaths, language),
    translatePublicContent(upcoming.map(publicEvent), eventPaths, language),
  ]);

  return {
    date: dayStart.toISOString(),
    spotlight: translatedSpotlight,
    today: translatedToday,
    upcoming: translatedUpcoming,
  };
};

// Liste tout le programme pour le super administrateur.
const list = () => programEventRepository.findAll();

// Retrouve un élément du programme ou lève une erreur 404.
const get = async (id) => {
  const event = await programEventRepository.findById(id);
  if (!event) throw new AppError(404, 'PROGRAM_EVENT_NOT_FOUND', 'Élément du programme introuvable.');
  return event;
};

// Vérifie la cohérence d'un élément : stand obligatoire pour l'affiche, fin après début, une seule affiche par jour.
const normalize = async (values, excludedId = null) => {
  const nextValues = { ...values };
  if (nextValues.occupantId && !(await programEventRepository.findOccupantById(nextValues.occupantId))) {
    throw new AppError(422, 'OCCUPANT_NOT_FOUND', 'Stand introuvable.');
  }

  if (nextValues.type === 'spotlight') {
    if (!nextValues.occupantId) throw new AppError(422, 'OCCUPANT_REQUIRED', 'Choisissez le stand à mettre à l’affiche.');
    nextValues.startsAt = startOfHubDay(nextValues.startsAt);
    nextValues.endsAt = null;
    const dayEnd = new Date(nextValues.startsAt.getTime() + DAY_MS);
    if (await programEventRepository.findSpotlightOn(nextValues.startsAt, dayEnd, excludedId)) {
      throw new AppError(409, 'SPOTLIGHT_TAKEN', 'Un stand est déjà à l’affiche ce jour-là.');
    }
  }

  if (nextValues.endsAt && new Date(nextValues.endsAt) <= new Date(nextValues.startsAt)) {
    throw new AppError(422, 'INVALID_PERIOD', 'L’heure de fin doit suivre l’heure de début.');
  }
  return nextValues;
};

// Ajoute un élément au programme.
const create = async (values) => {
  const created = await programEventRepository.create(await normalize(values));
  return get(created.id);
};

// Modifie un élément du programme en revalidant l'ensemble de ses valeurs.
const update = async (id, values) => {
  const event = await get(id);
  const merged = {
    occupantId: event.occupantId,
    type: event.type,
    title: event.title,
    description: event.description,
    location: event.location,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    ...values,
  };
  await programEventRepository.update(event, await normalize(merged, event.id));
  return get(id);
};

// Retire un élément du programme.
const remove = async (id) => {
  await programEventRepository.remove(await get(id));
};

module.exports = { getToday, list, create, update, remove, startOfHubDay };
