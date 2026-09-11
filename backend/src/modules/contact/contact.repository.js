const { Op, fn, col } = require('sequelize');
const { sequelize, Contact, User } = require('../../models');

const creatorInclude = [
  {
    model: User,
    as: 'createdBy',
    attributes: ['id', 'firstName', 'lastName'],
  },
];

const findAll = ({ occupantId, qualification, search, limit, offset }) => {
  const where = { occupantId };

  if (qualification) {
    where.qualification = qualification;
  }

  if (search) {
    where[Op.or] = [
      { fullName: { [Op.iLike]: `%${search}%` } },
      { phone: { [Op.iLike]: `%${search}%` } },
      { company: { [Op.iLike]: `%${search}%` } },
    ];
  }

  return Contact.findAndCountAll({
    where,
    include: creatorInclude,
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });
};

const findById = (occupantId, id) =>
  Contact.findOne({ where: { id, occupantId }, include: creatorInclude });

const findExisting = (occupantId, id, transaction) =>
  Contact.findOne({ where: { id, occupantId }, transaction });

const create = (values, transaction) => Contact.create(values, { transaction });
const update = (contact, values) => contact.update(values);

const countByQualification = (occupantId) =>
  Contact.findAll({
    where: { occupantId },
    attributes: ['qualification', [fn('COUNT', col('id')), 'count']],
    group: ['qualification'],
    raw: true,
  });

const countAll = (occupantId) => Contact.count({ where: { occupantId } });

module.exports = {
  sequelize,
  findAll,
  findById,
  findExisting,
  create,
  update,
  countByQualification,
  countAll,
};
