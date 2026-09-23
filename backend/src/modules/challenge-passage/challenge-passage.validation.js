const Joi = require('joi');

const create = Joi.object({
  code: Joi.string().trim().uppercase().pattern(/^[A-HJ-NP-Z2-9]{8}$/).required(),
  classification: Joi.string().trim().uppercase().valid('A', 'B', 'C').required(),
});

module.exports = { create };
