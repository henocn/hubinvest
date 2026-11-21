const { B2bNeed, Occupant } = require('../../models');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const findStand = (slug) => Occupant.findOne({
  where: { slug, status: 'active' },
  attributes: ['name', 'slug', 'standLabel', 'coverImageUrl', 'logoUrl', 'activity', 'updatedAt'],
});

const findNeed = (id) => (UUID.test(id) ? B2bNeed.findOne({
  where: { id, status: 'open' },
  attributes: ['id', 'title', 'description', 'updatedAt'],
  include: [{ model: Occupant, as: 'occupant', where: { status: 'active' }, required: true, attributes: ['name', 'coverImageUrl', 'logoUrl'] }],
}) : null);

const listStands = () => Occupant.findAll({
  where: { status: 'active' },
  attributes: ['name', 'slug', 'updatedAt'],
  order: [['name', 'ASC']],
});

const listNeeds = () => B2bNeed.findAll({
  where: { status: 'open' },
  attributes: ['id', 'title', 'updatedAt'],
  include: [{ model: Occupant, as: 'occupant', where: { status: 'active' }, required: true, attributes: ['name'] }],
  order: [['createdAt', 'DESC']],
});

module.exports = { findStand, findNeed, listStands, listNeeds };
