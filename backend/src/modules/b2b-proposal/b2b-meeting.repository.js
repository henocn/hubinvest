const { Op } = require('sequelize');
const { sequelize, B2bMeeting, B2bProposal, B2bNeed, User } = require('../../models');

const reportedByInclude = { model: User, as: 'reportedBy', attributes: ['id', 'firstName', 'lastName'] };

// Rendez-vous d'une demande, du plus tôt au plus tard.
const findByProposal = (b2bProposalId) => B2bMeeting.findAll({
  where: { b2bProposalId },
  include: [reportedByInclude],
  order: [['startsAt', 'ASC']],
});

const findById = (id, b2bProposalId) => B2bMeeting.findOne({ where: { id, b2bProposalId }, include: [reportedByInclude] });

// Rendez-vous qui commencent dans la fenêtre donnée, avec le stand de leur besoin :
// le service en déduit les tables et le stand déjà occupés.
const findStartingBetween = (from, to, transaction) => B2bMeeting.findAll({
  where: { startsAt: { [Op.gte]: from, [Op.lt]: to } },
  attributes: ['id', 'startsAt', 'durationMinutes', 'tableNumber', 'b2bProposalId'],
  include: [{
    model: B2bProposal,
    as: 'proposal',
    attributes: ['id'],
    required: true,
    include: [{ model: B2bNeed, as: 'need', attributes: ['id', 'occupantId'], required: true }],
  }],
  transaction,
});

// Un seul rendez-vous fixé à la fois (verrou lâché à la fin de la transaction) : deux personnes ne prennent pas la même table.
const lockSchedule = (transaction) => sequelize.query('SELECT pg_advisory_xact_lock(hashtext(:key))', { replacements: { key: 'b2b-meetings' }, transaction });

const create = (values, transaction) => B2bMeeting.create(values, { transaction });
const update = (meeting, values, transaction) => meeting.update(values, { transaction });
const destroy = (meeting) => meeting.destroy();

module.exports = { sequelize, findByProposal, findById, findStartingBetween, lockSchedule, create, update, destroy };
