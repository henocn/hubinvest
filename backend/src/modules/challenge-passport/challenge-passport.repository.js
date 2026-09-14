const { ChallengePassport, ChallengePassage, Occupant, User } = require('../../models');

const passageInclude = [{
  model: ChallengePassage,
  as: 'passages',
  attributes: ['id', 'createdAt'],
  include: [{ model: Occupant, as: 'occupant', attributes: ['id', 'name', 'standLabel'] }],
}];

const findPublicByToken = (token) => ChallengePassport.findOne({
  where: { token },
  include: passageInclude,
  order: [[{ model: ChallengePassage, as: 'passages' }, 'createdAt', 'ASC']],
});

const findAll = () => ChallengePassport.findAll({
  include: [
    ...passageInclude,
    { model: User, as: 'redeemedBy', attributes: ['id', 'firstName', 'lastName'] },
  ],
  order: [['createdAt', 'DESC']],
});

const findByCodeForUpdate = (code, transaction) => ChallengePassport.findOne({
  where: { code },
  transaction,
  lock: transaction.LOCK.UPDATE,
});

const findByIdForUpdate = (id, transaction) => ChallengePassport.findByPk(id, {
  transaction,
  lock: transaction.LOCK.UPDATE,
});

const create = (values) => ChallengePassport.create(values);
const update = (passport, values, transaction) => passport.update(values, { transaction });

module.exports = { findPublicByToken, findAll, findByCodeForUpdate, findByIdForUpdate, create, update };
