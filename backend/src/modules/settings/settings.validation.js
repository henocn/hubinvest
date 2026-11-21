const Joi = require('joi');

// Heure de la journée au format HH:MM (heure de Lomé).
const timeOfDay = /^([01]\d|2[0-3]):[0-5]\d$/;

const update = Joi.object({
  contactRequestsOpen: Joi.boolean(),
  investorDeskOpen: Joi.boolean(),
  b2bOpen: Joi.boolean(),
  challengeOpen: Joi.boolean(),
  wheelOpen: Joi.boolean(),
  liveQuestionsOpen: Joi.boolean(),
  requiredPassages: Joi.number().integer().min(1).max(50),
  wheelPlaysPerDay: Joi.number().integer().min(0).max(20),
  wheelSpinsPerCode: Joi.number().integer().min(1).max(20),
  b2bTables: Joi.number().integer().min(1).max(50),
  b2bMeetingMinutes: Joi.number().integer().min(5).max(120),
  b2bDayStart: Joi.string().pattern(timeOfDay),
  b2bDayEnd: Joi.string().pattern(timeOfDay),
}).min(1);

module.exports = { update };
