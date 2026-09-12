const fs = require('node:fs/promises');
const path = require('node:path');
const AppError = require('../../shared/app-error');
const occupantRepository = require('./occupant.repository');

const coverDirectory = path.resolve(__dirname, '..', '..', '..', 'uploads', 'covers');

const removeCoverFile = async (coverImageUrl) => {
  if (!coverImageUrl?.startsWith('/uploads/covers/')) return;
  try {
    await fs.unlink(path.join(coverDirectory, path.basename(coverImageUrl)));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
};

const slugify = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

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
  return occupantRepository.create({
    ...values,
    slug: values.slug || slugify(values.name),
  });
};

const update = async (id, values) => {
  const occupant = await get(id);
  const nextValues = { ...values };
  if (occupant.status === 'active' && nextValues.slug && nextValues.slug !== occupant.slug) {
    throw new AppError(409, 'PUBLIC_LINK_LOCKED', 'L’adresse publique d’un stand actif ne peut pas être modifiée.');
  }
  return occupantRepository.update(occupant, nextValues);
};

const updateCover = async (id, file) => {
  if (!file) {
    throw new AppError(422, 'COVER_IMAGE_REQUIRED', 'Choisissez une image de couverture.');
  }

  const nextCoverImageUrl = `/uploads/covers/${file.filename}`;
  let occupant;
  try {
    occupant = await get(id);
    const previousCoverImageUrl = occupant.coverImageUrl;
    const updated = await occupantRepository.update(occupant, { coverImageUrl: nextCoverImageUrl });
    await removeCoverFile(previousCoverImageUrl);
    return updated;
  } catch (error) {
    await removeCoverFile(nextCoverImageUrl);
    throw error;
  }
};

const remove = async (id) => {
  const occupant = await get(id);
  await occupantRepository.remove(occupant);
  await removeCoverFile(occupant.coverImageUrl);
};

module.exports = { list, listPublic, get, getPublic, create, update, updateCover, remove };
