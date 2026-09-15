const { Op } = require('sequelize');
const { InvestorRequest, Occupant, User } = require('../../models');

const assignedToInclude = [{
  model: User,
  as: 'assignedTo',
  attributes: ['id', 'firstName', 'lastName'],
}];

const occupantInclude = [{
  model: Occupant,
  as: 'occupant',
  attributes: ['id', 'name', 'standLabel'],
}];

const findAll = ({ status, search, limit, offset, occupantId }) => {
  const where = occupantId ? { occupantId } : {};
  if (status) where.status = status;
  if (search) {
    where[Op.or] = [
      { fullName: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
      { projectSummary: { [Op.iLike]: `%${search}%` } },
    ];
  }

  return InvestorRequest.findAndCountAll({
    where,
    include: [...assignedToInclude, ...occupantInclude],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });
};

const findById = (id, occupantId = null) => InvestorRequest.findOne({
  where: { id, ...(occupantId && { occupantId }) },
  include: [...assignedToInclude, ...occupantInclude],
});
const findActiveOccupantById = (id) => Occupant.findOne({ where: { id, status: 'active' }, attributes: ['id'] });
const create = (values) => InvestorRequest.create(values);
const update = (request, values) => request.update(values);

module.exports = { findAll, findById, findActiveOccupantById, create, update };
