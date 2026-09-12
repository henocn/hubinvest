const { Occupant } = require('../../models');

const findAll = (where = {}) =>
  Occupant.findAll({ where, order: [['name', 'ASC']] });

const findById = (id) => Occupant.findByPk(id);
const publicAttributes = ['id', 'name', 'slug', 'standLabel', 'coverImageUrl', 'activity'];
const publicWhere = { status: 'active' };
const findPublic = () => Occupant.findAll({
  where: publicWhere,
  attributes: publicAttributes,
  order: [['name', 'ASC']],
});
const findBySlug = (slug) => Occupant.findOne({
  where: { ...publicWhere, slug },
  attributes: publicAttributes,
});
const create = (values) => Occupant.create(values);
const update = (occupant, values) => occupant.update(values);
const remove = (occupant) => occupant.destroy();

module.exports = { findAll, findById, findPublic, findBySlug, create, update, remove };
