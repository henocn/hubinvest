const Joi = require('joi');

const eventParams = Joi.object({ eventId: Joi.string().guid().required() });
const params = Joi.object({ id: Joi.string().guid().required() });

const createPublic = Joi.object({
  question: Joi.string().trim().min(5).max(500).required(),
  authorName: Joi.string().trim().min(2).max(80).required(),
});

const update = Joi.object({ status: Joi.string().valid('new', 'asked', 'dismissed').required() });

module.exports = { eventParams, params, createPublic, update };
