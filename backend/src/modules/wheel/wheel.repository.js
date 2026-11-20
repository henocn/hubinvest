const { Op } = require('sequelize');
const { sequelize, WheelSegment, WheelCode, User, ChallengePassport } = require('../../models');

const segmentOrder = [['position', 'ASC'], ['createdAt', 'ASC']];

// Liste toutes les cases de la roue, actives ou non, pour l'administration.
const findSegments = () => WheelSegment.findAll({ order: segmentOrder });

// Liste les cases actives en les verrouillant le temps d'un tirage.
const findActiveSegmentsForUpdate = (transaction) => WheelSegment.findAll({
  where: { isActive: true },
  order: segmentOrder,
  transaction,
  lock: transaction.LOCK.UPDATE,
});

// Liste les cases actives pour l'affichage public.
const findActiveSegments = () => WheelSegment.findAll({ where: { isActive: true }, order: segmentOrder });

const findSegmentById = (id) => WheelSegment.findByPk(id);

// Donne la position suivant la dernière case, pour ajouter une case en fin de roue.
const nextPosition = async () => ((await WheelSegment.max('position')) || 0) + 1;

const createSegment = (values) => WheelSegment.create(values);

const updateSegment = (segment, values) => segment.update(values);

const removeSegment = (segment) => segment.destroy();

// Compte un lot de plus comme gagné, dans la transaction du tirage.
const recordAward = (segment, transaction) => segment.increment('awarded', { by: 1, transaction });

// Retrouve un code de jeu en le verrouillant le temps d'un tirage.
const findCodeForUpdate = (code, transaction) => WheelCode.findOne({
  where: { code },
  transaction,
  lock: transaction.LOCK.UPDATE,
});

// Retrouve le joueur identifié à partir de son lien personnel.
const findPlayerByToken = (token, transaction) => ChallengePassport.findOne({ where: { token }, attributes: ['id'], transaction });

const createCode = (values) => WheelCode.create(values);

const updateCode = (wheelCode, values, transaction) => wheelCode.update(values, { transaction });

// Un code expiré sans avoir été joué ne sert plus à rien : on n'en garde pas la trace.
const deleteExpiredCodes = () => WheelCode.destroy({ where: { usedAt: null, expiresAt: { [Op.lte]: new Date() } } });

// Historique : les codes joués et ceux encore valables, du plus récent au plus ancien, avec qui les a donnés et qui a joué.
const findCodes = () => WheelCode.findAll({
  where: { [Op.or]: [{ usedAt: { [Op.ne]: null } }, { expiresAt: { [Op.gt]: new Date() } }] },
  include: [
    { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName'], required: false },
    { model: ChallengePassport, as: 'player', attributes: ['id', 'displayName', 'email', 'phone'], required: false },
    { model: User, as: 'claimedBy', attributes: ['id', 'firstName', 'lastName'], required: false },
  ],
  order: [['createdAt', 'DESC']],
});

// Compte les parties jouées par un joueur depuis une date (limite quotidienne).
const countPlayerPlaysSince = (passportId, since, transaction) => WheelCode.count({
  where: { passportId, usedAt: { [Op.gte]: since } },
  transaction,
});

// Retrouve un code joué avec son joueur, verrouillé le temps de la remise du lot.
const findPlayedCodeForClaim = (code, transaction) => WheelCode.findOne({
  where: { code },
  include: [
    { model: ChallengePassport, as: 'player', attributes: ['id', 'displayName', 'email', 'phone'], required: false },
    { model: User, as: 'claimedBy', attributes: ['id', 'firstName', 'lastName'], required: false },
  ],
  transaction,
  ...(transaction && { lock: { level: transaction.LOCK.UPDATE, of: WheelCode } }),
});

// Compte les parties réellement jouées.
const countPlayed = () => WheelCode.count({ where: { usedAt: { [Op.ne]: null } } });

module.exports = {
  sequelize,
  findSegments,
  findActiveSegmentsForUpdate,
  findActiveSegments,
  findSegmentById,
  nextPosition,
  createSegment,
  updateSegment,
  removeSegment,
  recordAward,
  findCodeForUpdate,
  findPlayerByToken,
  createCode,
  updateCode,
  deleteExpiredCodes,
  findCodes,
  countPlayerPlaysSince,
  findPlayedCodeForClaim,
  countPlayed,
};
