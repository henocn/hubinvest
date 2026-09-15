const { ChallengePassport, ChallengePassage, Occupant, User } = require('../../models');

const publicPassageInclude = [{
  model: ChallengePassage,
  as: 'passages',
  attributes: ['id', 'createdAt'],
  include: [{ model: Occupant, as: 'occupant', attributes: ['id', 'name', 'standLabel'] }],
}];

const managerPassageInclude = [{
  model: ChallengePassage,
  as: 'passages',
  attributes: ['id', 'createdAt'],
  include: [
    { model: Occupant, as: 'occupant', attributes: ['id', 'name', 'standLabel'] },
    { model: User, as: 'validatedBy', attributes: ['id', 'firstName', 'lastName'] },
  ],
}];

const findPublicByToken = (token) => ChallengePassport.findOne({
  where: { token },
  include: publicPassageInclude,
  order: [[{ model: ChallengePassage, as: 'passages' }, 'createdAt', 'ASC']],
});

const findAll = () => ChallengePassport.findAll({
  include: [
    ...managerPassageInclude,
    { model: User, as: 'redeemedBy', attributes: ['id', 'firstName', 'lastName'] },
  ],
  order: [['createdAt', 'DESC']],
});

const findByCode = (code) => ChallengePassport.findOne({
  where: { code },
  include: managerPassageInclude,
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

module.exports = { findPublicByToken, findAll, findByCode, findByCodeForUpdate, findByIdForUpdate, create, update };
