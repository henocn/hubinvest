const Joi = require('joi');

const uuid = Joi.string().guid({ version: ['uuidv4'] });

const create = Joi.object({
  id: uuid,
  fullName: Joi.string().trim().min(2).max(160).required(),
  phone: Joi.string().trim().min(6).max(32).required(),
  company: Joi.string().trim().max(160).allow('', null),
  need: Joi.string().trim().max(4000).allow('', null),
  qualification: Joi.string().trim().uppercase().valid('A', 'B', 'C').default('C'),
  nextAction: Joi.string().trim().max(255).allow('', null),
  nextActionAt: Joi.date().iso().allow(null),
  consentOccupant: Joi.boolean().valid(true).required(),
  consentApizf: Joi.boolean().default(false),
});

const createPublic = Joi.object({
  id: uuid.required(),
  fullName: Joi.string().trim().min(2).max(160).required(),
  phone: Joi.string().trim().min(6).max(32).required(),
  need: Joi.string().trim().max(4000).allow('', null),
  consentOccupant: Joi.boolean().valid(true).required(),
});

const publicParams = Joi.object({
  slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180).required(),
});

const update = Joi.object({
  fullName: Joi.string().trim().min(2).max(160),
  phone: Joi.string().trim().min(6).max(32),
  company: Joi.string().trim().max(160).allow('', null),
  need: Joi.string().trim().max(4000).allow('', null),
  qualification: Joi.string().trim().uppercase().valid('A', 'B', 'C'),
  nextAction: Joi.string().trim().max(255).allow('', null),
  nextActionAt: Joi.date().iso().allow(null),
  consentOccupant: Joi.boolean(),
  consentApizf: Joi.boolean(),
}).min(1);

const params = Joi.object({ id: uuid.required() });

const query = Joi.object({
  qualification: Joi.string().trim().uppercase().valid('A', 'B', 'C'),
  search: Joi.string().trim().max(100).allow(''),
  // Sans limite, toutes les lignes : le back office et les exports Excel doivent tout voir.
  limit: Joi.number().integer().min(1).max(5000),
  offset: Joi.number().integer().min(0).default(0),
});

module.exports = { create, createPublic, publicParams, update, params, query };
