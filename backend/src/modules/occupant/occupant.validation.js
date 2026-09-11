const Joi = require('joi');

const uuid = Joi.string().guid({ version: ['uuidv4'] });

const create = Joi.object({
  name: Joi.string().trim().min(2).max(160).required(),
  slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180),
  proofNumber: Joi.number().integer().positive().allow(null),
  activity: Joi.string().trim().max(4000).allow('', null),
  status: Joi.string().valid('active', 'inactive').default('active'),
});

const update = Joi.object({
  name: Joi.string().trim().min(2).max(160),
  slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180),
  proofNumber: Joi.number().integer().positive().allow(null),
  activity: Joi.string().trim().max(4000).allow('', null),
  status: Joi.string().valid('active', 'inactive'),
}).min(1);

const params = Joi.object({ id: uuid.required() });
const publicParams = Joi.object({
  slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180).required(),
});

module.exports = { create, update, params, publicParams };
