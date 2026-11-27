const Joi = require('joi');

const create = Joi.object({
  code: Joi.string().trim().uppercase().pattern(/^(?:[A-HJ-NP-Z2-9]{6}|[A-HJ-NP-Z2-9]{8})$/).required(),
});

const player = Joi.string().hex().length(64).required();

// QR d'un stand scanné : son adresse, la signature de l'affiche et le joueur.
const quiz = Joi.object({
  slug: Joi.string().trim().max(160).required(),
  sig: Joi.string().trim().max(40).required(),
  player,
});

const answer = Joi.object({
  ticket: Joi.string().max(4000).required(),
  player,
  answers: Joi.array().items(Joi.number().integer().min(0).max(10)).min(1).max(5).required(),
});

module.exports = { create, quiz, answer };
