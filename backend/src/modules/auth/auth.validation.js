const Joi = require('joi');

const login = Joi.object({
  email: Joi.string().email().max(180).required(),
  password: Joi.string().min(8).max(128).required(),
});

const forgotPassword = Joi.object({
  email: Joi.string().email().max(180).required(),
});

const resetPassword = Joi.object({
  email: Joi.string().email().max(180).required(),
  code: Joi.string().pattern(/^\d{5}$/).required(),
  password: Joi.string().min(8).max(128).required(),
});

module.exports = { login, forgotPassword, resetPassword };
