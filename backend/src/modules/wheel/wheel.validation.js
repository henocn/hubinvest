const Joi = require('joi');
const { WHEEL_SEGMENT_KINDS } = require('../../models/wheel-segment.model');

const idParams = Joi.object({
  id: Joi.string().guid({ version: ['uuidv4'] }).required(),
});

const spin = Joi.object({
  code: Joi.string().trim().min(4).max(16).required(),
  player: Joi.string().hex().length(64).required(),
  // La roue affichée au joueur (identifiants des cases, dans l'ordre), reprise pour le tirage.
  wheel: Joi.array().items(Joi.string().guid()).max(40),
});

// Vérification du code avant d'afficher la roue.
const checkCode = Joi.object({
  code: Joi.string().trim().min(4).max(16).required(),
  player: Joi.string().hex().length(64).required(),
});

const fields = {
  kind: Joi.string().valid(...WHEEL_SEGMENT_KINDS),
  label: Joi.string().trim().min(1).max(60),
  quantity: Joi.number().integer().min(0).max(100000).allow(null),
  isActive: Joi.boolean(),
};

const createSegment = Joi.object({
  ...fields,
  kind: fields.kind.required(),
  label: fields.label.required(),
});

const updateSegment = Joi.object(fields).min(1);

const codeParams = Joi.object({ code: Joi.string().trim().pattern(/^[A-Za-z0-9-]{3,16}$/).required() });

module.exports = { idParams, codeParams, checkCode, spin, createSegment, updateSegment };
