const AppError = require('../../shared/app-error');
const occupantRepository = require('./occupant.repository');

const slugify = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const assertPublishable = (values) => {
  if (values.isPublished && (values.status !== 'active' || !values.activity?.trim())) {
    throw new AppError(422, 'STAND_NOT_READY', 'Pour publier ce stand, il doit être actif et son activité doit être renseignée.');
  }
};

const list = () => occupantRepository.findAll();
const listPublic = () => occupantRepository.findPublic();

const get = async (id) => {
  const occupant = await occupantRepository.findById(id);
  if (!occupant) {
    throw new AppError(404, 'OCCUPANT_NOT_FOUND', 'Occupant introuvable.');
  }
  return occupant;
};

const getPublic = async (slug) => {
  const occupant = await occupantRepository.findBySlug(slug);
  if (!occupant) {
    throw new AppError(404, 'OCCUPANT_NOT_FOUND', 'Occupant introuvable.');
  }
  return occupant;
};

const create = (values) => {
  assertPublishable(values);
  return occupantRepository.create({
    ...values,
    slug: values.slug || slugify(values.name),
  });
};

const update = async (id, values) => {
  const occupant = await get(id);
  const nextValues = { ...values };
  if (occupant.isPublished && nextValues.slug && nextValues.slug !== occupant.slug) {
    throw new AppError(409, 'PUBLIC_LINK_LOCKED', 'L’adresse publique d’un stand publié ne peut pas être modifiée.');
  }
  assertPublishable({
    status: nextValues.status ?? occupant.status,
    activity: Object.prototype.hasOwnProperty.call(nextValues, 'activity') ? nextValues.activity : occupant.activity,
    isPublished: nextValues.isPublished ?? occupant.isPublished,
  });
  return occupantRepository.update(occupant, nextValues);
};

const remove = async (id) => {
  const occupant = await get(id);
  await occupantRepository.remove(occupant);
};

module.exports = { list, listPublic, get, getPublic, create, update, remove };
