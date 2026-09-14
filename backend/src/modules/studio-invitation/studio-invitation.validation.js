const Joi = require('joi');

const tokenParams = Joi.object({
  token: Joi.string().hex().length(64).required(),
});

const idParams = Joi.object({
  id: Joi.string().guid({ version: ['uuidv4'] }).required(),
});

const create = Joi.object({
  guestName: Joi.string().trim().min(2).max(160).required(),
  subject: Joi.string().trim().min(3).max(180).required(),
  scheduledAt: Joi.date().iso().required(),
});

const update = Joi.object({
  guestName: Joi.string().trim().min(2).max(160),
  subject: Joi.string().trim().min(3).max(180),
  scheduledAt: Joi.date().iso(),
}).min(1);

const respond = Joi.object({
  status: Joi.string().valid('confirmed', 'declined').required(),
});

module.exports = { tokenParams, idParams, create, update, respond };
