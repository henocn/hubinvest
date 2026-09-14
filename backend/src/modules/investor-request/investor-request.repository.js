const { Op } = require('sequelize');
const { InvestorRequest, User } = require('../../models');

const assignedToInclude = [{
  model: User,
  as: 'assignedTo',
  attributes: ['id', 'firstName', 'lastName'],
}];

const findAll = ({ status, search, limit, offset }) => {
  const where = {};
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
    include: assignedToInclude,
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });
};

const findById = (id) => InvestorRequest.findByPk(id, { include: assignedToInclude });
const create = (values) => InvestorRequest.create(values);
const update = (request, values) => request.update(values);

module.exports = { findAll, findById, create, update };
