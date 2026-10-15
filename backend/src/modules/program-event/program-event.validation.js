const Joi = require('joi');
const { PROGRAM_EVENT_TYPES } = require('../../models/program-event.model');

const idParams = Joi.object({
  id: Joi.string().guid({ version: ['uuidv4'] }).required(),
});

const optionalText = (max) => Joi.string().trim().max(max).allow('', null).empty('');

const fields = {
  occupantId: Joi.string().guid({ version: ['uuidv4'] }).allow(null),
  type: Joi.string().valid(...PROGRAM_EVENT_TYPES),
  title: Joi.string().trim().min(2).max(180),
  description: optionalText(2000),
  location: optionalText(120),
  startsAt: Joi.date().iso(),
  endsAt: Joi.date().iso().allow(null),
};

const create = Joi.object({
  ...fields,
  type: fields.type.required(),
  title: fields.title.required(),
  description: fields.description.default(null),
  location: fields.location.default(null),
  startsAt: fields.startsAt.required(),
});

const update = Joi.object(fields).min(1);

module.exports = { idParams, create, update };
