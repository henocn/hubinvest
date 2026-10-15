const Joi = require('joi');

const endpoint = Joi.string().uri({ scheme: ['https'] }).max(2048).required();

const subscribe = Joi.object({
  endpoint,
  expirationTime: Joi.any(),
  keys: Joi.object({
    p256dh: Joi.string().max(255).required(),
    auth: Joi.string().max(255).required(),
  }).required(),
});

const unsubscribe = Joi.object({ endpoint });

module.exports = { subscribe, unsubscribe };
