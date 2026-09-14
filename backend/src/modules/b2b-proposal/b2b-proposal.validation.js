const Joi = require('joi');

const uuid = Joi.string().guid({ version: ['uuidv4'] });
const needParams = Joi.object({ needId: uuid.required() });
const params = Joi.object({ id: uuid.required() });
const createPublic = Joi.object({
  fullName: Joi.string().trim().min(2).max(160).required(),
  email: Joi.string().trim().email().max(180).required(),
  phone: Joi.string().trim().min(6).max(32).allow('', null),
  message: Joi.string().trim().min(10).max(4000).required(),
  consentOccupant: Joi.boolean().valid(true).required(),
});
const update = Joi.object({ status: Joi.string().valid('accepted', 'declined').required() });

module.exports = { needParams, params, createPublic, update };
