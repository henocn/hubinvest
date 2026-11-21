const { ChallengePassage, Occupant, sequelize } = require('../../models');

const findExisting = (passportId, occupantId, transaction) => ChallengePassage.findOne({
  where: { passportId, occupantId },
  transaction,
});

const create = (values, transaction) => ChallengePassage.create(values, { transaction });
const countByPassport = (passportId, transaction) => ChallengePassage.count({ where: { passportId }, transaction });
const countByOccupant = (occupantId) => ChallengePassage.count({ where: { occupantId } });

// Passages d'un joueur avec l'espace de chaque stand, pour savoir quelle étape reste à faire.
const findByPassport = (passportId, transaction) => ChallengePassage.findAll({
  where: { passportId },
  include: [{ model: Occupant, as: 'occupant', attributes: ['id', 'space'] }],
  transaction,
});
const findOccupant = (occupantId, transaction) => Occupant.findByPk(occupantId, { attributes: ['id', 'space'], transaction });

module.exports = { sequelize, findExisting, create, countByPassport, countByOccupant, findByPassport, findOccupant };
