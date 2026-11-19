const fs = require('node:fs/promises');
const path = require('node:path');
const { imageSizeFromFile } = require('image-size/fromFile');
const AppError = require('../../shared/app-error');
const { translatePublicContent } = require('../../shared/translation.service');
const occupantRepository = require('./occupant.repository');
const { events: realtime } = require('../realtime/realtime.service');

const coverDirectory = path.resolve(__dirname, '..', '..', '..', 'uploads', 'covers');
const logoDirectory = path.resolve(__dirname, '..', '..', '..', 'uploads', 'logos');
const galleryDirectory = path.resolve(__dirname, '..', '..', '..', 'uploads', 'gallery');
const GALLERY_LIMIT = 5;

const removeGalleryFile = async (url) => {
  if (!url?.startsWith('/uploads/gallery/')) return;
  try {
    await fs.unlink(path.join(galleryDirectory, path.basename(url)));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
};

const removeCoverFile = async (coverImageUrl) => {
  if (!coverImageUrl?.startsWith('/uploads/covers/')) return;
  try {
    await fs.unlink(path.join(coverDirectory, path.basename(coverImageUrl)));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
};

const removeLogoFile = async (logoUrl) => {
  if (!logoUrl?.startsWith('/uploads/logos/')) return;
  try {
    await fs.unlink(path.join(logoDirectory, path.basename(logoUrl)));
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
const listPublic = async (language) => translatePublicContent(
  await occupantRepository.findPublic(),
  ['name', 'standLabel', 'activity'],
  language,
);

const get = async (id) => {
  const occupant = await occupantRepository.findById(id);
  if (!occupant) {
    throw new AppError(404, 'OCCUPANT_NOT_FOUND', 'Occupant introuvable.');
  }
  return occupant;
};

const getPublic = async (slug, language) => {
  const occupant = await occupantRepository.findBySlug(slug);
  if (!occupant) {
    throw new AppError(404, 'OCCUPANT_NOT_FOUND', 'Occupant introuvable.');
  }
  return translatePublicContent(occupant, ['name', 'standLabel', 'activity', 'products', 'services'], language);
};

const create = async (values) => {
  const occupant = await occupantRepository.create({
    ...values,
    slug: values.slug || slugify(values.name),
  });
  realtime.occupantsChanged(occupant.id);
  return occupant;
};

const update = async (id, values) => {
  const occupant = await get(id);
  const nextValues = { ...values };
  if (occupant.status === 'active' && nextValues.slug && nextValues.slug !== occupant.slug) {
    throw new AppError(409, 'PUBLIC_LINK_LOCKED', 'L’adresse publique d’un stand actif ne peut pas être modifiée.');
  }
  const updated = await occupantRepository.update(occupant, nextValues);
  realtime.occupantsChanged(id);
  return updated;
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
    realtime.occupantsChanged(id);
    return updated;
  } catch (error) {
    await removeCoverFile(nextCoverImageUrl);
    throw error;
  }
};

const updateLogo = async (id, file) => {
  if (!file) {
    throw new AppError(422, 'OCCUPANT_LOGO_REQUIRED', 'Choisissez le logo de la structure.');
  }

  const nextLogoUrl = `/uploads/logos/${file.filename}`;
  try {
    let dimensions;
    try {
      dimensions = await imageSizeFromFile(file.path);
    } catch {
      throw new AppError(422, 'INVALID_OCCUPANT_LOGO', 'Le fichier choisi n’est pas une image valide.');
    }

    if (!dimensions.width || !dimensions.height || dimensions.width > 1200 || dimensions.height > 1200) {
      throw new AppError(422, 'INVALID_OCCUPANT_LOGO_DIMENSIONS', 'Le logo ne doit pas dépasser 1200 × 1200 pixels.');
    }

    const occupant = await get(id);
    const previousLogoUrl = occupant.logoUrl;
    const updated = await occupantRepository.update(occupant, { logoUrl: nextLogoUrl });
    await removeLogoFile(previousLogoUrl);
    realtime.occupantsChanged(id);
    return updated;
  } catch (error) {
    await removeLogoFile(nextLogoUrl);
    throw error;
  }
};

// Ajoute une photo à la galerie du stand (5 au plus) ; le fichier est retiré si l'ajout échoue.
const addGalleryImage = async (id, file) => {
  if (!file) throw new AppError(422, 'GALLERY_IMAGE_REQUIRED', 'Choisissez une image.');
  const url = `/uploads/gallery/${file.filename}`;
  try {
    const occupant = await get(id);
    const gallery = Array.isArray(occupant.gallery) ? occupant.gallery : [];
    if (gallery.length >= GALLERY_LIMIT) {
      throw new AppError(422, 'GALLERY_FULL', `La galerie contient déjà ${GALLERY_LIMIT} images. Retirez-en une avant d’en ajouter.`);
    }
    const updated = await occupantRepository.update(occupant, { gallery: [...gallery, url] });
    realtime.occupantsChanged(id);
    return updated;
  } catch (error) {
    await removeGalleryFile(url);
    throw error;
  }
};

// Retire une photo de la galerie et supprime son fichier.
const removeGalleryImage = async (id, url) => {
  const occupant = await get(id);
  const gallery = Array.isArray(occupant.gallery) ? occupant.gallery : [];
  if (!gallery.includes(url)) throw new AppError(404, 'GALLERY_IMAGE_NOT_FOUND', 'Cette image n’est plus dans la galerie.');
  const updated = await occupantRepository.update(occupant, { gallery: gallery.filter((item) => item !== url) });
  await removeGalleryFile(url);
  realtime.occupantsChanged(id);
  return updated;
};

const remove = async (id) => {
  const occupant = await get(id);
  await occupantRepository.remove(occupant);
  await removeCoverFile(occupant.coverImageUrl);
  await removeLogoFile(occupant.logoUrl);
  await Promise.all((occupant.gallery || []).map(removeGalleryFile));
  realtime.occupantsChanged(id);
};

module.exports = { list, listPublic, get, getPublic, create, update, updateCover, updateLogo, addGalleryImage, removeGalleryImage, remove, GALLERY_LIMIT };
