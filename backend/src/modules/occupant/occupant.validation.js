const Joi = require('joi');

const { OCCUPANT_SPACES } = require('../../shared/challenge-steps');

const uuid = Joi.string().guid({ version: ['uuidv4'] });

const create = Joi.object({
  name: Joi.string().trim().min(2).max(160).required(),
  slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180),
  standLabel: Joi.string().trim().max(80).allow('', null),
  activity: Joi.string().trim().max(4000).allow('', null),
  products: Joi.string().trim().max(4000).allow('', null),
  services: Joi.string().trim().max(4000).allow('', null),
  website: Joi.string().trim().uri({ scheme: ['http', 'https'] }).max(255).allow('', null),
  space: Joi.string().valid(...OCCUPANT_SPACES).default('industry'),
  status: Joi.string().valid('active', 'inactive').default('active'),
});

const update = Joi.object({
  name: Joi.string().trim().min(2).max(160),
  slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180),
  standLabel: Joi.string().trim().max(80).allow('', null),
  activity: Joi.string().trim().max(4000).allow('', null),
  products: Joi.string().trim().max(4000).allow('', null),
  services: Joi.string().trim().max(4000).allow('', null),
  website: Joi.string().trim().uri({ scheme: ['http', 'https'] }).max(255).allow('', null),
  space: Joi.string().valid(...OCCUPANT_SPACES),
  status: Joi.string().valid('active', 'inactive'),
}).min(1);

// Ce que l'occupant modifie lui-même sur sa fiche (le reste est ignoré).
const ownUpdate = Joi.object({
  activity: Joi.string().trim().max(4000).allow('', null),
  products: Joi.string().trim().max(4000).allow('', null),
  services: Joi.string().trim().max(4000).allow('', null),
  website: Joi.string().trim().uri({ scheme: ['http', 'https'] }).max(255).allow('', null),
}).min(1);

const params = Joi.object({ id: uuid.required() });
const galleryImage = Joi.object({ url: Joi.string().trim().pattern(/^\/uploads\/gallery\/[A-Za-z0-9-]+\.(?:jpg|png|webp)$/).required() });
const publicParams = Joi.object({
  slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180).required(),
});

module.exports = { create, update, ownUpdate, params, publicParams, galleryImage };
