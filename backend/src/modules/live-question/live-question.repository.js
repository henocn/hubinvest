const { Op } = require('sequelize');
const { LiveQuestion, Occupant, ProgramEvent, User } = require('../../models');

const findEvent = (id) => ProgramEvent.findByPk(id, { attributes: ['id', 'type', 'title', 'startsAt', 'endsAt'] });

const create = (values) => LiveQuestion.create(values);

// Questions reçues depuis une date, avec le direct concerné et la personne qui les a traitées.
const findSince = (since) => LiveQuestion.findAll({
  where: { createdAt: { [Op.gte]: since } },
  include: [
    {
      model: ProgramEvent,
      as: 'event',
      attributes: ['id', 'type', 'title', 'location', 'startsAt', 'endsAt'],
      include: [{ model: Occupant, as: 'occupant', attributes: ['id', 'name'], required: false }],
    },
    { model: User, as: 'handledBy', attributes: ['id', 'firstName', 'lastName'], required: false },
  ],
  order: [['createdAt', 'DESC']],
});

const findById = (id) => LiveQuestion.findByPk(id);

// Questions pas encore traitées (ni posées ni écartées) : la pastille du menu Questions.
const countNew = () => LiveQuestion.count({ where: { status: 'new' } });

const update = (question, values) => question.update(values);

module.exports = { findEvent, create, findSince, findById, update, countNew };
