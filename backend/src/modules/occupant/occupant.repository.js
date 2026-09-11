const { Occupant } = require('../../models');

const findAll = (where = {}) =>
  Occupant.findAll({ where, order: [['name', 'ASC']] });

const findById = (id) => Occupant.findByPk(id);
const findBySlug = (slug) => Occupant.findOne({ where: { slug, status: 'active' } });
const create = (values) => Occupant.create(values);
const update = (occupant, values) => occupant.update(values);

module.exports = { findAll, findById, findBySlug, create, update };
