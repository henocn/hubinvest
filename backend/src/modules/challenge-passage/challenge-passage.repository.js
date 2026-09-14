const { ChallengePassage, sequelize } = require('../../models');

const findExisting = (passportId, occupantId, transaction) => ChallengePassage.findOne({
  where: { passportId, occupantId },
  transaction,
});

const create = (values, transaction) => ChallengePassage.create(values, { transaction });
const countByPassport = (passportId, transaction) => ChallengePassage.count({ where: { passportId }, transaction });
const countByOccupant = (occupantId) => ChallengePassage.count({ where: { occupantId } });

module.exports = { sequelize, findExisting, create, countByPassport, countByOccupant };
