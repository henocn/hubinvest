const { Op } = require('sequelize');
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

// Recherche de secours d'un joueur qui a perdu son code : nom, e-mail, téléphone ou début du code.
const escapeLike = (value) => value.replace(/[%_\\]/g, (character) => `\\${character}`);

const search = (query, limit = 8) => {
  const text = escapeLike(query);
  const digits = query.replace(/\D/g, '');
  return ChallengePassport.findAll({
    where: {
      [Op.or]: [
        { displayName: { [Op.iLike]: `%${text}%` } },
        { email: { [Op.iLike]: `%${text}%` } },
        { code: { [Op.iLike]: `${text}%` } },
        ...(digits.length >= 4 ? [{ phone: { [Op.like]: `%${digits}%` } }] : []),
      ],
    },
    attributes: ['id', 'code', 'displayName', 'email', 'phone', 'status'],
    order: [['createdAt', 'DESC']],
    limit,
  });
};

const findByCodeForUpdate = (code, transaction) => ChallengePassport.findOne({
  where: { code },
  transaction,
  lock: transaction.LOCK.UPDATE,
});

const findByIdForUpdate = (id, transaction) => ChallengePassport.findByPk(id, {
  transaction,
  lock: transaction.LOCK.UPDATE,
});

// Liste les récompenses remises, la plus récente en premier.
const findRedeemed = () => ChallengePassport.findAll({
  where: { status: 'redeemed' },
  attributes: ['id', 'displayName', 'email', 'phone', 'contact', 'redeemedAt', 'redeemedByUserId'],
  order: [['redeemedAt', 'DESC']],
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

module.exports = {
  search,
  findPublicByToken, findRedeemed, findIdByToken, findOccupantIds, findAll, findByCode, findByCodeForUpdate, findByIdForUpdate, create, update };
