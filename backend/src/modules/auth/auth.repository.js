const { User, Occupant } = require('../../models');

const findUserByEmail = (email) =>
  User.unscoped().findOne({
    where: { email },
    include: [{ model: Occupant, as: 'occupant', attributes: ['id', 'name', 'slug', 'status'] }],
  });

module.exports = { findUserByEmail };
