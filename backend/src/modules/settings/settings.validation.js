const Joi = require('joi');

const update = Joi.object({
  contactRequestsOpen: Joi.boolean(),
  investorDeskOpen: Joi.boolean(),
  b2bOpen: Joi.boolean(),
  challengeOpen: Joi.boolean(),
  wheelOpen: Joi.boolean(),
  liveQuestionsOpen: Joi.boolean(),
  requiredPassages: Joi.number().integer().min(1).max(50),
  wheelPlaysPerDay: Joi.number().integer().min(0).max(20),
}).min(1);

module.exports = { update };
