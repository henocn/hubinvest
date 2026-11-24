const { User, Occupant } = require('../../models');

const includeOccupant = [{ model: Occupant, as: 'occupant', attributes: ['id', 'name', 'slug', 'standLabel', 'activity', 'logoUrl', 'space'] }];

const findAll = () =>
  User.findAll({
    include: includeOccupant,
    order: [
      ['lastName', 'ASC'],
      ['firstName', 'ASC'],
    ],
  });

const findById = (id) => User.findByPk(id, { include: includeOccupant });
const findByIdWithPassword = (id) => User.unscoped().findByPk(id, { include: includeOccupant });
const findOccupantById = (id) => Occupant.findByPk(id);
const create = (values) => User.create(values);
const update = async (user, values) => user.update(values);
const remove = (user) => user.destroy();

module.exports = { findAll, findById, findByIdWithPassword, findOccupantById, create, update, remove };
