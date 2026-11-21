const AppError = require('../../shared/app-error');
const { translatePublicContent } = require('../../shared/translation.service');
const serviceRepository = require('./service.repository');
const { events: realtime } = require('../realtime/realtime.service');

// Les six services de l'API-ZF et les douze démarches en ligne (document v4, M1 et M9).
const publicService = (item) => ({ id: item.id, stage: item.stage, title: item.title, promise: item.promise, place: item.place, limited: item.limited });
const publicProcedure = (item) => ({ id: item.id, title: item.title, domain: item.domain, url: item.url });

// Ce que l'accueil « Nos services » affiche, traduit dans la langue du visiteur.
const getPublic = async (language) => {
  const [services, procedures] = await Promise.all([serviceRepository.findServices(true), serviceRepository.findProcedures(true)]);
  const [translatedServices, translatedProcedures] = await Promise.all([
    translatePublicContent(services.map(publicService), ['title', 'promise', 'place'], language),
    translatePublicContent(procedures.map(publicProcedure), ['title'], language),
  ]);
  return { services: translatedServices, procedures: translatedProcedures };
};

const list = async () => {
  const [services, procedures] = await Promise.all([serviceRepository.findServices(), serviceRepository.findProcedures()]);
  return { services, procedures };
};

const get = async (kind, id) => {
  const item = await serviceRepository.findById(kind, id);
  if (!item) throw new AppError(404, 'SERVICE_NOT_FOUND', kind === 'services' ? 'Service introuvable.' : 'Démarche introuvable.');
  return item;
};

const clean = (values) => Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value === '' ? null : value]));

const create = async (kind, values) => {
  const item = await serviceRepository.create(kind, { ...clean(values), position: await serviceRepository.nextPosition(kind) });
  realtime.servicesChanged();
  return item;
};

const update = async (kind, id, values) => {
  const item = await serviceRepository.update(await get(kind, id), clean(values));
  realtime.servicesChanged();
  return item;
};

const remove = async (kind, id) => {
  await serviceRepository.destroy(await get(kind, id));
  realtime.servicesChanged();
};

const reorder = async (kind, ids) => {
  await serviceRepository.reorder(kind, ids);
  realtime.servicesChanged();
  return list();
};

module.exports = { getPublic, list, create, update, remove, reorder };
