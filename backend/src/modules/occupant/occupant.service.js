const AppError = require('../../shared/app-error');
const occupantRepository = require('./occupant.repository');

const slugify = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const list = () => occupantRepository.findAll();
const listPublic = () => occupantRepository.findAll({ status: 'active' });

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

const create = (values) =>
  occupantRepository.create({
    ...values,
    slug: values.slug || slugify(values.name),
  });

const update = async (id, values) => {
  const occupant = await get(id);
  const nextValues = { ...values };
  if (nextValues.name && !nextValues.slug && nextValues.name !== occupant.name) {
    nextValues.slug = slugify(nextValues.name);
  }
  return occupantRepository.update(occupant, nextValues);
};

module.exports = { list, listPublic, get, getPublic, create, update };
