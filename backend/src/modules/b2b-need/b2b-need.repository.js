const { literal } = require('sequelize');
const { B2bNeed, Occupant, User } = require('../../models');

// Pour le back office : demandes reçues sur le besoin et demandes déjà traitées (acceptées ou refusées).
const proposalCounts = [
  [literal('(SELECT COUNT(*)::int FROM b2b_proposals AS p WHERE p.b2b_need_id = "B2bNeed"."id")'), 'proposalCount'],
  [literal('(SELECT COUNT(*)::int FROM b2b_proposals AS p WHERE p.b2b_need_id = "B2bNeed"."id" AND p.status <> \'pending\')'), 'handledCount'],
];

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

const findAll = (occupantId = null) => B2bNeed.findAll({
  where: occupantId ? { occupantId } : {},
  attributes: { include: proposalCounts },
  include: [...occupantInclude, ...creatorInclude],
  order: [['createdAt', 'DESC']],
});

const findById = (id, occupantId = null) => B2bNeed.findOne({
  where: { id, ...(occupantId && { occupantId }) },
  include: [...occupantInclude, ...creatorInclude],
});
const findOccupantById = (id) => Occupant.findByPk(id, { attributes: ['id', 'name', 'status'] });
const create = (values) => B2bNeed.create(values);
const update = (need, values) => need.update(values);

module.exports = { findPublic, findPublicById, findAll, findById, findOccupantById, create, update };
