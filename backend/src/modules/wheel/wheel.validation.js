const Joi = require('joi');
const { WHEEL_SEGMENT_KINDS } = require('../../models/wheel-segment.model');

const idParams = Joi.object({
  id: Joi.string().guid({ version: ['uuidv4'] }).required(),
});

const spin = Joi.object({
  code: Joi.string().trim().min(4).max(16).required(),
});

const fields = {
  kind: Joi.string().valid(...WHEEL_SEGMENT_KINDS),
  label: Joi.string().trim().min(1).max(60),
  sponsor: Joi.string().trim().max(120).allow('', null).empty('').default(null),
  quantity: Joi.number().integer().min(0).max(100000).allow(null),
  isActive: Joi.boolean(),
};

const createSegment = Joi.object({
  ...fields,
  kind: fields.kind.required(),
  label: fields.label.required(),
});

const updateSegment = Joi.object({ ...fields, sponsor: Joi.string().trim().max(120).allow('', null).empty('') }).min(1);

module.exports = { idParams, spin, createSegment, updateSegment };
