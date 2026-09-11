const AppError = require('../../shared/app-error');
const contactRepository = require('./contact.repository');

const requireOccupant = (user) => {
  if (!user.occupantId) {
    throw new AppError(403, 'OCCUPANT_REQUIRED', 'Ce compte ne depend pas d’un occupant.');
  }
  return user.occupantId;
};

const list = async (user, query) => {
  const occupantId = requireOccupant(user);
  const result = await contactRepository.findAll({ occupantId, ...query });
  return {
    items: result.rows,
    pagination: {
      total: result.count,
      limit: query.limit,
      offset: query.offset,
    },
  };
};

const get = async (user, id) => {
  const occupantId = requireOccupant(user);
  const contact = await contactRepository.findById(occupantId, id);
  if (!contact) {
    throw new AppError(404, 'CONTACT_NOT_FOUND', 'Contact introuvable.');
  }
  return contact;
};

const create = async (user, values) => {
  const occupantId = requireOccupant(user);

  return contactRepository.sequelize.transaction(async (transaction) => {
    if (values.id) {
      const existing = await contactRepository.findExisting(occupantId, values.id, transaction);
      if (existing) {
        return { contact: existing, created: false };
      }
    }

    const contact = await contactRepository.create(
      {
        ...values,
        occupantId,
        createdByUserId: user.id,
      },
      transaction,
    );

    return { contact, created: true };
  });
};

const update = async (user, id, values) => {
  const contact = await get(user, id);
  return contactRepository.update(contact, values);
};

const stats = async (user) => {
  const occupantId = requireOccupant(user);
  const [total, groups] = await Promise.all([
    contactRepository.countAll(occupantId),
    contactRepository.countByQualification(occupantId),
  ]);

  const byQualification = { hot: 0, warm: 0, cold: 0 };
  groups.forEach((group) => {
    byQualification[group.qualification] = Number(group.count);
  });

  return { total, byQualification };
};

module.exports = { list, get, create, update, stats };
