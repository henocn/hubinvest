const { sequelize, Occupant } = require('../../models');

// Le Stand API-ZF vient toujours en premier, puis les autres stands par nom.
const STAND_ORDER = [[sequelize.literal("CASE WHEN \"Occupant\".\"space\" = 'apizf' THEN 0 ELSE 1 END"), 'ASC'], ['name', 'ASC']];

const findAll = (where = {}) =>
  Occupant.findAll({ where, order: STAND_ORDER });

const findById = (id) => Occupant.findByPk(id);
const publicAttributes = ['id', 'name', 'slug', 'standLabel', 'coverImageUrl', 'logoUrl', 'activity', 'products', 'services', 'website', 'gallery'];
const publicWhere = { status: 'active' };
const findPublic = () => Occupant.findAll({
  where: publicWhere,
  attributes: publicAttributes,
  order: STAND_ORDER,
});
const findBySlug = (slug) => Occupant.findOne({
  where: { ...publicWhere, slug },
  attributes: publicAttributes,
});
const create = (values) => Occupant.create(values);
const update = (occupant, values) => occupant.update(values);
const remove = (occupant) => occupant.destroy();

module.exports = { findAll, findById, findPublic, findBySlug, create, update, remove };
