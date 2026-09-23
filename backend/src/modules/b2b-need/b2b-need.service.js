const AppError = require('../../shared/app-error');
const roles = require('../../shared/roles');
const { translatePublicContent } = require('../../shared/translation.service');
const b2bNeedRepository = require('./b2b-need.repository');

const standFor = (user) => {
  if (user.role === roles.SUPER_ADMIN) return null;
  if (!user.occupantId) throw new AppError(403, 'STAND_REQUIRED', 'Cet administrateur n’est rattaché à aucun stand.');
  return user.occupantId;
};

const publicPaths = ['title', 'description', 'occupant.name', 'occupant.standLabel'];

const listPublic = async (language) => translatePublicContent(
  await b2bNeedRepository.findPublic(),
  publicPaths,
  language,
);

const getPublic = async (id, language) => {
  const need = await b2bNeedRepository.findPublicById(id);
  if (!need) throw new AppError(404, 'B2B_NEED_NOT_FOUND', 'Besoin B2B introuvable.');
  return translatePublicContent(need, publicPaths, language);
};

const list = (user) => b2bNeedRepository.findAll(standFor(user));

const getManaged = async (user, id) => {
  const need = await b2bNeedRepository.findById(id, standFor(user));
  if (!need) throw new AppError(404, 'B2B_NEED_NOT_FOUND', 'Besoin B2B introuvable.');
  return need;
};

const requireOccupant = async (occupantId) => {
  if (!occupantId) throw new AppError(422, 'OCCUPANT_REQUIRED', 'Choisissez un stand.');
  const occupant = await b2bNeedRepository.findOccupantById(occupantId);
  if (!occupant) throw new AppError(422, 'OCCUPANT_NOT_FOUND', 'Stand introuvable.');
  return occupant;
};

const create = async (user, values) => {
  const occupantId = standFor(user) || values.occupantId;
  await requireOccupant(occupantId);
  return b2bNeedRepository.create({
    occupantId,
    createdByUserId: user.id,
    title: values.title,
    description: values.description,
    status: 'open',
  });
};

const update = async (user, id, values) => {
  const need = await getManaged(user, id);
  const nextValues = { ...values };
  if (user.role === roles.ADMIN) delete nextValues.occupantId;
  if (nextValues.occupantId) await requireOccupant(nextValues.occupantId);
  return b2bNeedRepository.update(need, nextValues);
};

module.exports = { listPublic, getPublic, list, getManaged, create, update };
