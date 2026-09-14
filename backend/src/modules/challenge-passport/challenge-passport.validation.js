const Joi = require('joi');

const tokenParams = Joi.object({
  token: Joi.string().hex().length(64).required(),
});

const idParams = Joi.object({
  id: Joi.string().guid({ version: ['uuidv4'] }).required(),
});

const createPublic = Joi.object({
  displayName: Joi.string().trim().min(2).max(120).required(),
  contact: Joi.string().trim().min(5).max(180).required(),
});

module.exports = { tokenParams, idParams, createPublic };
