const Joi = require('joi');

const uuid = Joi.string().guid({ version: ['uuidv4'] });

const createPublic = Joi.object({
  fullName: Joi.string().trim().min(2).max(160).required(),
  email: Joi.string().trim().email().max(180).required(),
  phone: Joi.string().trim().min(6).max(32).allow('', null),
  projectSummary: Joi.string().trim().min(10).max(6000).required(),
  consentApizf: Joi.boolean().valid(true).required(),
});

// Saisie par l'équipe de l'API-ZF (rencontre au guichet, appel…).
const createManual = Joi.object({
  fullName: Joi.string().trim().min(2).max(160).required(),
  email: Joi.string().trim().email().max(180).required(),
  phone: Joi.string().trim().min(6).max(32).allow('', null),
  projectSummary: Joi.string().trim().min(10).max(6000).required(),
  status: Joi.string().valid('new', 'in_progress', 'closed').default('new'),
  nextAction: Joi.string().trim().max(255).allow('', null),
  consentApizf: Joi.boolean().default(false),
});

const update = Joi.object({
  status: Joi.string().valid('new', 'in_progress', 'closed'),
  nextAction: Joi.string().trim().max(255).allow('', null),
}).min(1);

const params = Joi.object({ id: uuid.required() });

const query = Joi.object({
  status: Joi.string().valid('new', 'in_progress', 'closed'),
  search: Joi.string().trim().max(100).allow(''),
  // Sans limite, toutes les lignes : le back office et les exports Excel doivent tout voir.
  limit: Joi.number().integer().min(1).max(5000),
  offset: Joi.number().integer().min(0).default(0),
});

module.exports = { createPublic, createManual, update, params, query };
