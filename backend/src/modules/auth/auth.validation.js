const Joi = require('joi');

const login = Joi.object({
  email: Joi.string().email().max(180).required(),
  password: Joi.string().min(8).max(128).required(),
});

module.exports = { login };
