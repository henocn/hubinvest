const AppError = require('../../shared/app-error');
const b2bNeedRepository = require('./b2b-need.repository');

const requireOccupant = (user) => {
  if (!user.occupantId) throw new AppError(403, 'OCCUPANT_REQUIRED', 'Ce compte ne dépend pas d’un occupant.');
  return user.occupantId;
};

const listPublic = () => b2bNeedRepository.findPublic();

const getPublic = async (id) => {
  const need = await b2bNeedRepository.findPublicById(id);
  if (!need) throw new AppError(404, 'B2B_NEED_NOT_FOUND', 'Besoin B2B introuvable.');
  return need;
};

const list = (user) => b2bNeedRepository.findAllByOccupant(requireOccupant(user));

const getForOccupant = async (user, id) => {
  const need = await b2bNeedRepository.findByIdForOccupant(id, requireOccupant(user));
  if (!need) throw new AppError(404, 'B2B_NEED_NOT_FOUND', 'Besoin B2B introuvable.');
  return need;
};

const create = (user, values) => b2bNeedRepository.create({
  occupantId: requireOccupant(user),
  createdByUserId: user.id,
  title: values.title,
  description: values.description,
  status: 'open',
});

const update = async (user, id, values) => {
  const need = await getForOccupant(user, id);
  return b2bNeedRepository.update(need, values);
};

module.exports = { listPublic, getPublic, list, getForOccupant, create, update };
