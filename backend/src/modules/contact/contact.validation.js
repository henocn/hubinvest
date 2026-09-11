const Joi = require('joi');

const uuid = Joi.string().guid({ version: ['uuidv4'] });

const create = Joi.object({
  id: uuid,
  fullName: Joi.string().trim().min(2).max(160).required(),
  phone: Joi.string().trim().min(6).max(32).required(),
  company: Joi.string().trim().max(160).allow('', null),
  need: Joi.string().trim().max(4000).allow('', null),
  qualification: Joi.string().valid('hot', 'warm', 'cold').default('cold'),
  nextAction: Joi.string().trim().max(255).allow('', null),
  nextActionAt: Joi.date().iso().allow(null),
  consentOccupant: Joi.boolean().valid(true).required(),
  consentApizf: Joi.boolean().default(false),
});

const update = Joi.object({
  fullName: Joi.string().trim().min(2).max(160),
  phone: Joi.string().trim().min(6).max(32),
  company: Joi.string().trim().max(160).allow('', null),
  need: Joi.string().trim().max(4000).allow('', null),
  qualification: Joi.string().valid('hot', 'warm', 'cold'),
  nextAction: Joi.string().trim().max(255).allow('', null),
  nextActionAt: Joi.date().iso().allow(null),
  consentOccupant: Joi.boolean(),
  consentApizf: Joi.boolean(),
}).min(1);

const params = Joi.object({ id: uuid.required() });

const query = Joi.object({
  qualification: Joi.string().valid('hot', 'warm', 'cold'),
  search: Joi.string().trim().max(100).allow(''),
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
});

module.exports = { create, update, params, query };
