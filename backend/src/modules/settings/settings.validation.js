const Joi = require('joi');

const update = Joi.object({
  contactRequestsOpen: Joi.boolean(),
  investorDeskOpen: Joi.boolean(),
  b2bOpen: Joi.boolean(),
  challengeOpen: Joi.boolean(),
  wheelOpen: Joi.boolean(),
  requiredPassages: Joi.number().integer().min(1).max(50),
}).min(1);

module.exports = { update };
