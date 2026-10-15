const { B2bProposal, B2bNeed, Occupant, User } = require('../../models');

const handlerInclude = [{ model: User, as: 'handledBy', attributes: ['id', 'firstName', 'lastName'] }];

const findAllByNeed = (b2bNeedId) => B2bProposal.findAll({
  where: { b2bNeedId },
  include: handlerInclude,
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

module.exports = { findAllByNeed, findById, create, update };
