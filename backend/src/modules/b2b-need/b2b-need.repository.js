const { B2bNeed, Occupant, User } = require('../../models');

const occupantInclude = [{
  model: Occupant,
  as: 'occupant',
  attributes: ['id', 'name', 'slug', 'standLabel', 'coverImageUrl'],
}];

const creatorInclude = [{
  model: User,
  as: 'createdBy',
  attributes: ['id', 'firstName', 'lastName'],
}];

const findPublic = () => B2bNeed.findAll({
  where: { status: 'open' },
  attributes: ['id', 'title', 'description', 'createdAt'],
  include: [{ ...occupantInclude[0], where: { status: 'active' }, required: true }],
  order: [['createdAt', 'DESC']],
});

const findPublicById = (id) => B2bNeed.findOne({
  where: { id, status: 'open' },
  attributes: ['id', 'title', 'description', 'createdAt'],
  include: [{ ...occupantInclude[0], where: { status: 'active' }, required: true }],
});

const findAll = () => B2bNeed.findAll({
  include: [...occupantInclude, ...creatorInclude],
  order: [['createdAt', 'DESC']],
});

const findById = (id) => B2bNeed.findByPk(id, { include: [...occupantInclude, ...creatorInclude] });
const findOccupantById = (id) => Occupant.findByPk(id, { attributes: ['id', 'name', 'status'] });
const create = (values) => B2bNeed.create(values);
const update = (need, values) => need.update(values);

module.exports = { findPublic, findPublicById, findAll, findById, findOccupantById, create, update };
