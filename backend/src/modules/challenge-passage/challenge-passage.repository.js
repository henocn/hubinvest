const { ChallengePassage, sequelize } = require('../../models');

const findExisting = (passportId, occupantId, transaction) => ChallengePassage.findOne({
  where: { passportId, occupantId },
  transaction,
});

const create = (values, transaction) => ChallengePassage.create(values, { transaction });
const countByPassport = (passportId, transaction) => ChallengePassage.count({ where: { passportId }, transaction });

module.exports = { sequelize, findExisting, create, countByPassport };
