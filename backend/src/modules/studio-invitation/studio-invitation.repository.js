const { Op } = require('sequelize');
const { StudioInvitation, Occupant, User } = require('../../models');

const creatorInclude = { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName'] };
const occupantInclude = { model: Occupant, as: 'occupant', attributes: ['id', 'name', 'standLabel'] };

// Invitations du Studio : créneaux réservés d'abord (dans l'ordre), puis celles en attente de réservation.
const findAll = (occupantId = null) => StudioInvitation.findAll({
  where: occupantId ? { occupantId } : {},
  include: [creatorInclude, occupantInclude],
  order: [['scheduledAt', 'ASC NULLS LAST'], ['createdAt', 'DESC']],
});

const findById = (id, occupantId = null) => StudioInvitation.findOne({
  where: { id, ...(occupantId && { occupantId }) },
  include: [creatorInclude, occupantInclude],
});

const findByToken = (token) => StudioInvitation.findOne({ where: { token }, include: [occupantInclude] });
const findOccupantById = (id) => Occupant.findByPk(id, { attributes: ['id'] });

// Créneaux déjà réservés sur une période (pour proposer les créneaux libres).
const findBookedBetween = (from, to) => StudioInvitation.findAll({
  where: { status: 'booked', scheduledAt: { [Op.gte]: from, [Op.lt]: to } },
  attributes: ['id', 'scheduledAt'],
});

const create = (values) => StudioInvitation.create(values);
const update = (invitation, values) => invitation.update(values);
const destroy = (invitation) => invitation.destroy();

module.exports = { findAll, findById, findByToken, findOccupantById, findBookedBetween, create, update, destroy };
