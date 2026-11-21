const { literal } = require('sequelize');
const { B2bProposal, B2bNeed, Occupant, User } = require('../../models');

const handlerInclude = [{ model: User, as: 'handledBy', attributes: ['id', 'firstName', 'lastName'] }];

const findAllByNeed = (b2bNeedId) => B2bProposal.findAll({
  where: { b2bNeedId },
  include: handlerInclude,
  order: [['createdAt', 'DESC']],
});

// Toutes les demandes, avec le besoin et le stand concernés ; limitées à un stand quand occupantId est donné.
// Avec le nombre de rendez-vous fixés pour chaque demande.
const findAllVisible = (occupantId = null) => B2bProposal.findAll({
  attributes: { include: [[literal('(SELECT COUNT(*)::int FROM b2b_meetings AS m WHERE m.b2b_proposal_id = "B2bProposal"."id")'), 'meetingCount']] },
  include: [
    ...handlerInclude,
    {
      model: B2bNeed,
      as: 'need',
      attributes: ['id', 'occupantId', 'title', 'status'],
      required: true,
      ...(occupantId && { where: { occupantId } }),
      include: [{ model: Occupant, as: 'occupant', attributes: ['id', 'name'] }],
    },
  ],
  order: [['createdAt', 'DESC']],
});

const findById = (id) => B2bProposal.findOne({
  where: { id },
  include: [
    ...handlerInclude,
    {
      model: B2bNeed,
      as: 'need',
      attributes: ['id', 'occupantId', 'title'],
      required: true,
      include: [{ model: Occupant, as: 'occupant', attributes: ['id', 'name'] }],
    },
  ],
});

const create = (values) => B2bProposal.create(values);
const update = (proposal, values) => proposal.update(values);
const destroy = (proposal) => proposal.destroy();

module.exports = { findAllByNeed, findAllVisible, findById, create, update, destroy };
