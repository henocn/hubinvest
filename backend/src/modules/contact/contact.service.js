const { UniqueConstraintError } = require('sequelize');
const AppError = require('../../shared/app-error');
const roles = require('../../shared/roles');
const contactRepository = require('./contact.repository');

const requireOccupant = (user) => {
  if (!user.occupantId) {
    throw new AppError(403, 'OCCUPANT_REQUIRED', 'Ce compte ne dépend pas d’un occupant.');
  }
  return user.occupantId;
};

const list = async (user, query) => {
  const occupantId = requireOccupant(user);
  const result = await contactRepository.findAll({ ...query, occupantId });
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

  try {
    return await contactRepository.sequelize.transaction(async (transaction) => {
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
  } catch (error) {
    if (values.id && error instanceof UniqueConstraintError) {
      const existing = await contactRepository.findExisting(occupantId, values.id);
      if (existing) {
        return { contact: existing, created: false };
      }
    }
    throw error;
  }
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

const adminStats = async (user) => {
  if (![roles.SUPER_ADMIN, roles.ADMIN_APIZF].includes(user.role)) {
    throw new AppError(403, 'FORBIDDEN', "Vous n’avez pas accès à cette action.");
  }

  const groups = await contactRepository.countByOccupant();
  const byOccupant = {};
  let total = 0;

  groups.forEach((group) => {
    const count = Number(group.count);
    byOccupant[group.occupantId] = count;
    total += count;
  });

  return { total, byOccupant };
};

module.exports = { list, get, create, update, stats, adminStats };
