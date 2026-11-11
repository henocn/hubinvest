const Joi = require('joi');

const tokenParams = Joi.object({
  token: Joi.string().hex().length(64).required(),
});

const idParams = Joi.object({
  id: Joi.string().guid({ version: ['uuidv4'] }).required(),
});

// Le format du téléphone est contrôlé par le formulaire ; le serveur garde la valeur reçue.
const createPublic = Joi.object({
  firstName: Joi.string().trim().min(1).max(80).required(),
  lastName: Joi.string().trim().min(1).max(80).required(),
  email: Joi.string().trim().lowercase().email().max(180).required(),
  phone: Joi.string().trim().min(6).max(32).required(),
});

const rewardCode = Joi.object({
  code: Joi.string().trim().uppercase().pattern(/^[A-HJ-NP-Z2-9]{8}$/).required(),
});
const rewardCodeParams = Joi.object({
  code: Joi.string().trim().uppercase().pattern(/^[A-HJ-NP-Z2-9]{8}$/).required(),
});

module.exports = { tokenParams, idParams, createPublic, rewardCode, rewardCodeParams };
