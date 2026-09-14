const { B2bProposal, B2bNeed, User } = require('../../models');

const handlerInclude = [{ model: User, as: 'handledBy', attributes: ['id', 'firstName', 'lastName'] }];

const findAllByNeed = (b2bNeedId) => B2bProposal.findAll({
  where: { b2bNeedId },
  include: handlerInclude,
  order: [['createdAt', 'DESC']],
});

const findByIdForOccupant = (id, occupantId) => B2bProposal.findOne({
  where: { id },
  include: [
    ...handlerInclude,
    { model: B2bNeed, as: 'need', attributes: ['id', 'occupantId'], where: { occupantId }, required: true },
  ],
});

const create = (values) => B2bProposal.create(values);
const update = (proposal, values) => proposal.update(values);

module.exports = { findAllByNeed, findByIdForOccupant, create, update };
