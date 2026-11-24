const { Op } = require('sequelize');
const { B2bFollowUp, B2bNeed, B2bProposal, Contact, ContactFollowUp, InvestorFollowUp, InvestorRequest, Occupant, User } = require('../../models');

const person = ['id', 'firstName', 'lastName'];
// Les relances faites restent visibles quelques jours, sous celles à faire.
const DONE_KEPT_DAYS = 14;
const recentDone = () => new Date(Date.now() - DONE_KEPT_DAYS * 24 * 60 * 60 * 1000);
const openOrRecent = () => ({ [Op.or]: [{ doneAt: null }, { doneAt: { [Op.gte]: recentDone() } }] });

const contactInclude = (occupantId) => ({
  model: Contact,
  as: 'contact',
  attributes: ['id', 'fullName', 'phone', 'email', 'company', 'qualification', 'occupantId'],
  where: occupantId ? { occupantId } : undefined,
  required: true,
  include: [{ model: Occupant, as: 'occupant', attributes: ['id', 'name'] }],
});

// Relances des contacts : celles d'un stand, ou de tous les stands pour l'équipe API-ZF.
const findContactFollowUps = (occupantId) => ContactFollowUp.findAll({
  where: openOrRecent(),
  include: [contactInclude(occupantId), { model: User, as: 'createdBy', attributes: person, required: false }],
  order: [['dueAt', 'ASC']],
});

const findContactFollowUp = (id, occupantId) => ContactFollowUp.findOne({ where: { id }, include: [contactInclude(occupantId)] });
const findContact = (id, occupantId) => Contact.findOne({ where: { id, ...(occupantId && { occupantId }) } });
const findPendingContactFollowUps = (contactId, { sources } = {}) => ContactFollowUp.findAll({
  where: { contactId, doneAt: null, ...(sources && { autoSource: { [Op.in]: sources } }) },
  order: [['dueAt', 'ASC']],
});
const createContactFollowUp = (values) => ContactFollowUp.create(values);
const updateContactFollowUp = (followUp, values) => followUp.update(values);
const destroyContactFollowUp = (followUp) => followUp.destroy();

// Relances des guichets (toutes, pour l'équipe API-ZF), avec le contact concerné.
const findInvestorFollowUps = () => InvestorFollowUp.findAll({
  where: openOrRecent(),
  include: [
    { model: InvestorRequest, as: 'request', attributes: ['id', 'fullName', 'organization', 'guichet', 'phone', 'email'], required: true },
    { model: User, as: 'createdBy', attributes: person, required: false },
  ],
  order: [['dueAt', 'ASC']],
});

// Relances à faire avant une date : pastille du menu et agenda du jour.
const countContactDue = (before, occupantId) => ContactFollowUp.count({
  where: { doneAt: null, dueAt: { [Op.lt]: before } },
  include: [{ model: Contact, as: 'contact', attributes: [], where: occupantId ? { occupantId } : undefined, required: true }],
});
const findContactDue = (before, occupantId, limit = 12) => ContactFollowUp.findAll({
  where: { doneAt: null, dueAt: { [Op.lt]: before } },
  include: [contactInclude(occupantId)],
  order: [['dueAt', 'ASC']],
  limit,
});

// Relances B2B : la demande concernée, avec le besoin et son stand (celles d'un stand, ou toutes pour l'API-ZF).
const proposalInclude = (occupantId) => ({
  model: B2bProposal,
  as: 'proposal',
  attributes: ['id', 'fullName', 'email', 'phone'],
  required: true,
  include: [{
    model: B2bNeed,
    as: 'need',
    attributes: ['id', 'title', 'occupantId'],
    where: occupantId ? { occupantId } : undefined,
    required: true,
    include: [{ model: Occupant, as: 'occupant', attributes: ['id', 'name'] }],
  }],
});
// Une demande B2B du stand (ou de tous les stands pour l'API-ZF), avec son besoin.
const findProposal = (id, occupantId) => B2bProposal.findOne({
  where: { id },
  attributes: ['id', 'fullName'],
  include: [{ model: B2bNeed, as: 'need', attributes: ['id', 'occupantId'], where: occupantId ? { occupantId } : undefined, required: true }],
});
const findB2bFollowUps = (occupantId) => B2bFollowUp.findAll({
  where: openOrRecent(),
  include: [proposalInclude(occupantId), { model: User, as: 'createdBy', attributes: person, required: false }],
  order: [['dueAt', 'ASC']],
});
const findB2bFollowUp = (id, occupantId) => B2bFollowUp.findOne({ where: { id }, include: [proposalInclude(occupantId)] });
const createB2bFollowUp = (values) => B2bFollowUp.create(values);
const updateB2bFollowUp = (followUp, values) => followUp.update(values);
const destroyB2bFollowUp = (followUp) => followUp.destroy();
const countB2bDue = (before, occupantId) => B2bFollowUp.count({
  where: { doneAt: null, dueAt: { [Op.lt]: before } },
  include: [{ ...proposalInclude(occupantId), attributes: [], include: [{ model: B2bNeed, as: 'need', attributes: [], where: occupantId ? { occupantId } : undefined, required: true }] }],
});
const findB2bDue = (before, occupantId, limit = 12) => B2bFollowUp.findAll({
  where: { doneAt: null, dueAt: { [Op.lt]: before } },
  include: [proposalInclude(occupantId)],
  order: [['dueAt', 'ASC']],
  limit,
});

module.exports = {
  findB2bFollowUps,
  findProposal,
  findB2bFollowUp,
  createB2bFollowUp,
  updateB2bFollowUp,
  destroyB2bFollowUp,
  countB2bDue,
  findB2bDue,
  findContactFollowUps,
  findContactFollowUp,
  findContact,
  findPendingContactFollowUps,
  createContactFollowUp,
  updateContactFollowUp,
  destroyContactFollowUp,
  findInvestorFollowUps,
  countContactDue,
  findContactDue,
};
