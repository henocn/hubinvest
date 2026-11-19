const Joi = require('joi');

const tokenParams = Joi.object({
  token: Joi.string().hex().length(64).required(),
});

const idParams = Joi.object({
  id: Joi.string().guid({ version: ['uuidv4'] }).required(),
});

// Deux champs seulement : le nom complet et un moyen de joindre le joueur (e-mail ou téléphone).
// Le format du téléphone est contrôlé par le formulaire ; le serveur garde la valeur reçue.
const createPublic = Joi.object({
  fullName: Joi.string().trim().min(2).max(120).required(),
  contact: Joi.alternatives().try(
    Joi.string().trim().lowercase().email().max(180),
    Joi.string().trim().pattern(/^\+?[\d\s().-]{6,32}$/),
  ).required(),
});

const rewardCode = Joi.object({
  code: Joi.string().trim().uppercase().pattern(/^(?:[A-HJ-NP-Z2-9]{6}|[A-HJ-NP-Z2-9]{8})$/).required(),
});
const searchQuery = Joi.object({ q: Joi.string().trim().min(2).max(80).required() });

const rewardCodeParams = Joi.object({
  code: Joi.string().trim().uppercase().pattern(/^(?:[A-HJ-NP-Z2-9]{6}|[A-HJ-NP-Z2-9]{8})$/).required(),
});

module.exports = { tokenParams, idParams, createPublic, rewardCode, rewardCodeParams, searchQuery };
