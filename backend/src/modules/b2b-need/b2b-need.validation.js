const Joi = require('joi');

const uuid = Joi.string().guid({ version: ['uuidv4'] });
const params = Joi.object({ id: uuid.required() });
const create = Joi.object({
  occupantId: uuid,
  title: Joi.string().trim().min(3).max(180).required(),
  description: Joi.string().trim().min(10).max(6000).required(),
});
const update = Joi.object({
  occupantId: uuid,
  title: Joi.string().trim().min(3).max(180),
  description: Joi.string().trim().min(10).max(6000),
  status: Joi.string().valid('open', 'closed'),
}).min(1);

module.exports = { params, create, update };
