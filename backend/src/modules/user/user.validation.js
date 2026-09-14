const Joi = require('joi');
const roles = require('../../shared/roles');

const uuid = Joi.string().guid({ version: ['uuidv4'] });

const create = Joi.object({
  occupantId: uuid.allow(null),
  firstName: Joi.string().trim().min(2).max(80).required(),
  lastName: Joi.string().trim().min(2).max(80).required(),
  email: Joi.string().email().max(180).required(),
  phone: Joi.string().trim().max(32).allow('', null),
  password: Joi.string().min(8).max(128).required(),
  role: Joi.string().valid(...Object.values(roles)).required(),
  isActive: Joi.boolean().default(true),
});

const update = Joi.object({
  occupantId: uuid.allow(null),
  firstName: Joi.string().trim().min(2).max(80),
  lastName: Joi.string().trim().min(2).max(80),
  email: Joi.string().email().max(180),
  phone: Joi.string().trim().max(32).allow('', null),
  password: Joi.string().min(8).max(128),
  role: Joi.string().valid(...Object.values(roles)),
  isActive: Joi.boolean(),
}).min(1);

const params = Joi.object({ id: uuid.required() });
const changePassword = Joi.object({
  currentPassword: Joi.string().min(8).max(128).required(),
  newPassword: Joi.string().min(8).max(128).required(),
});

module.exports = { create, update, params, changePassword };
