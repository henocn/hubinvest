const { Op } = require('sequelize');
const { sequelize, WheelSegment, WheelCode, WheelPlay, User, ChallengePassport } = require('../../models');

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

// Rend au stock un lot gagné dont la partie est supprimée sans que le lot ait été remis.
const releaseAward = (segmentId, transaction) => WheelSegment.decrement('awarded', { by: 1, where: { id: segmentId, awarded: { [Op.gt]: 0 } }, transaction });

const removePlay = (play, transaction) => play.destroy({ transaction });

// Retrouve un code de jeu en le verrouillant le temps d'un tirage.
const findCodeForUpdate = (code, transaction) => WheelCode.findOne({
  where: { code },
  transaction,
  lock: transaction.LOCK.UPDATE,
});

// Tours déjà joués avec un code (joueur compris), pour savoir s'il en reste et à qui il appartient.
const findCodePlays = (wheelCodeId, transaction) => WheelPlay.findAll({
  where: { wheelCodeId },
  attributes: ['id', 'passportId'],
  transaction,
});

// Retrouve le joueur identifié à partir de son lien personnel.
const findPlayerByToken = (token, transaction) => ChallengePassport.findOne({ where: { token }, attributes: ['id'], transaction });

const createCode = (values) => WheelCode.create(values);

const createPlay = (values, transaction) => WheelPlay.create(values, { transaction });

const updatePlay = (play, values, transaction) => play.update(values, { transaction });

// Tous les codes délivrés, avec le résultat de leurs tours : pour la fenêtre « Code de jeu ».
const findCodes = () => WheelCode.findAll({
  attributes: ['id', 'code', 'spinsAllowed', 'createdAt'],
  include: [{ model: WheelPlay, as: 'plays', attributes: ['resultKind'], required: false }],
  order: [['createdAt', 'DESC']],
});

const playIncludes = [
  { model: WheelCode, as: 'wheelCode', attributes: ['id', 'code'] },
  { model: ChallengePassport, as: 'player', attributes: ['id', 'displayName', 'email', 'phone'], required: false },
  { model: User, as: 'claimedBy', attributes: ['id', 'firstName', 'lastName'], required: false },
];

// Historique : les tours joués, du plus récent au plus ancien.
const findPlays = () => WheelPlay.findAll({ include: playIncludes, order: [['playedAt', 'DESC']] });

// Lots gagnés avec un code, le plus ancien d'abord ; verrouillés le temps de la remise.
const findCodePrizes = (code, transaction) => WheelPlay.findAll({
  where: { resultKind: 'prize' },
  include: [{ ...playIncludes[0], where: { code } }, ...playIncludes.slice(1)],
  order: [['playedAt', 'ASC']],
  transaction,
  ...(transaction && { lock: { level: transaction.LOCK.UPDATE, of: WheelPlay } }),
});

// Un tour précis, verrouillé le temps de la remise de son lot.
const findPlayForClaim = (id, transaction) => WheelPlay.findByPk(id, {
  include: playIncludes,
  transaction,
  lock: { level: transaction.LOCK.UPDATE, of: WheelPlay },
});

const findCodeByValue = (code) => WheelCode.findOne({ where: { code }, attributes: ['id'] });

const countPlays = (wheelCodeId) => WheelPlay.count({ where: { wheelCodeId } });

// Compte les tours réellement joués.
const countPlayed = () => WheelPlay.count();

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
  releaseAward,
  removePlay,
  findCodeForUpdate,
  findCodePlays,
  findPlayerByToken,
  createCode,
  createPlay,
  updatePlay,
  findCodes,
  findPlays,
  findCodePrizes,
  findPlayForClaim,
  findCodeByValue,
  countPlays,
  countPlayed,
};
