const AppError = require('../../shared/app-error');
const b2bNeedRepository = require('./b2b-need.repository');

const listPublic = () => b2bNeedRepository.findPublic();

const getPublic = async (id) => {
  const need = await b2bNeedRepository.findPublicById(id);
  if (!need) throw new AppError(404, 'B2B_NEED_NOT_FOUND', 'Besoin B2B introuvable.');
  return need;
};

const list = () => b2bNeedRepository.findAll();

const getManaged = async (id) => {
  const need = await b2bNeedRepository.findById(id);
  if (!need) throw new AppError(404, 'B2B_NEED_NOT_FOUND', 'Besoin B2B introuvable.');
  return need;
};

const requireOccupant = async (occupantId) => {
  const occupant = await b2bNeedRepository.findOccupantById(occupantId);
  if (!occupant) throw new AppError(422, 'OCCUPANT_NOT_FOUND', 'Stand introuvable.');
  return occupant;
};

const create = async (user, values) => {
  await requireOccupant(values.occupantId);
  return b2bNeedRepository.create({
    occupantId: values.occupantId,
    createdByUserId: user.id,
    title: values.title,
    description: values.description,
    status: 'open',
  });
};

const update = async (user, id, values) => {
  const need = await getManaged(id);
  if (values.occupantId) await requireOccupant(values.occupantId);
  return b2bNeedRepository.update(need, values);
};

module.exports = { listPublic, getPublic, list, getManaged, create, update };
