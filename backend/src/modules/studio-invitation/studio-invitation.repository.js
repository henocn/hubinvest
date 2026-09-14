const { StudioInvitation, User } = require('../../models');

const creatorInclude = [{
  model: User,
  as: 'createdBy',
  attributes: ['id', 'firstName', 'lastName'],
}];

const findAll = () => StudioInvitation.findAll({
  include: creatorInclude,
  order: [['scheduledAt', 'ASC']],
});

const findById = (id) => StudioInvitation.findByPk(id, { include: creatorInclude });
const findByToken = (token) => StudioInvitation.findOne({ where: { token } });
const create = (values) => StudioInvitation.create(values);
const update = (invitation, values) => invitation.update(values);

module.exports = { findAll, findById, findByToken, create, update };
