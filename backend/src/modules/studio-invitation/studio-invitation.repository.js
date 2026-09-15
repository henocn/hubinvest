const { StudioInvitation, Occupant, User } = require('../../models');

const creatorInclude = [{
  model: User,
  as: 'createdBy',
  attributes: ['id', 'firstName', 'lastName'],
}];

const occupantInclude = [{
  model: Occupant,
  as: 'occupant',
  attributes: ['id', 'name', 'standLabel'],
}];

const findAll = (occupantId = null) => StudioInvitation.findAll({
  where: occupantId ? { occupantId } : {},
  include: [...creatorInclude, ...occupantInclude],
  order: [['scheduledAt', 'ASC']],
});

const findById = (id, occupantId = null) => StudioInvitation.findOne({
  where: { id, ...(occupantId && { occupantId }) },
  include: [...creatorInclude, ...occupantInclude],
});
const findByToken = (token) => StudioInvitation.findOne({ where: { token } });
const findOccupantById = (id) => Occupant.findByPk(id, { attributes: ['id'] });
const create = (values) => StudioInvitation.create(values);
const update = (invitation, values) => invitation.update(values);

module.exports = { findAll, findById, findByToken, findOccupantById, create, update };
