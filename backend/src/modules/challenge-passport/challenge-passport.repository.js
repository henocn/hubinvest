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
  attributes: ['id', 'classification', 'createdAt'],
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

const findAll = (occupantId = null) => ChallengePassport.findAll({
  include: [
    {
      ...managerPassageInclude[0],
      ...(occupantId && { where: { occupantId }, required: true }),
    },
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

// Retrouve seulement l'identifiant d'un parcours à partir de son lien personnel.
const findIdByToken = (token) => ChallengePassport.findOne({ where: { token }, attributes: ['id'] });

// Liste les stands qui ont validé un passage de ce parcours.
const findOccupantIds = async (passportId, transaction) => (await ChallengePassage.findAll({
  where: { passportId },
  attributes: ['occupantId'],
  transaction,
})).map((passage) => passage.occupantId);

const create = (values) => ChallengePassport.create(values);
const update = (passport, values, transaction) => passport.update(values, { transaction });

module.exports = { findPublicByToken, findIdByToken, findOccupantIds, findAll, findByCode, findByCodeForUpdate, findByIdForUpdate, create, update };
