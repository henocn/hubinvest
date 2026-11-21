const Joi = require('joi');

const uuid = Joi.string().guid({ version: ['uuidv4'] });

const createPublic = Joi.object({
  fullName: Joi.string().trim().min(2).max(160).required(),
  email: Joi.string().trim().email().max(180).required(),
  phone: Joi.string().trim().min(6).max(32).allow('', null),
  projectSummary: Joi.string().trim().min(10).max(6000).required(),
  consentApizf: Joi.boolean().valid(true).required(),
});

// Saisie par l'équipe de l'API-ZF (rencontre au guichet, appel…).
const createManual = Joi.object({
  fullName: Joi.string().trim().min(2).max(160).required(),
  email: Joi.string().trim().email().max(180).required(),
  phone: Joi.string().trim().min(6).max(32).allow('', null),
  projectSummary: Joi.string().trim().min(10).max(6000).required(),
  consentApizf: Joi.boolean().default(false),
});

// Suivi : classe A·B·C, interlocuteur nommé, réponses de qualification (clé → valeur). Le statut est calculé.
const update = Joi.object({
  classification: Joi.string().trim().uppercase().valid('A', 'B', 'C').allow(null),
  contactUserId: uuid.allow(null),
  qualification: Joi.object().pattern(Joi.string().max(40), Joi.alternatives(Joi.string().trim().max(500).allow(''), Joi.number(), Joi.boolean()).allow(null)),
}).min(1);

// Relance faite : moyen (appel ou message), note, étape suivante (obligatoire pour A et B, contrôlée par le service), date de la prochaine relance.
const followUp = Joi.object({
  channel: Joi.string().valid('call', 'message').required(),
  note: Joi.string().trim().max(2000).allow('', null),
  nextStep: Joi.string().trim().max(255).allow('', null),
  nextFollowUpAt: Joi.date().iso().allow(null),
  doneAt: Joi.date().iso().max('now'),
});

// Rendez-vous : date et heure, lieu.
const meeting = Joi.object({
  startsAt: Joi.date().iso().required(),
  location: Joi.string().trim().min(2).max(160).required(),
});

// Valider (tenu) ou annuler un rendez-vous prévu.
const meetingStatus = Joi.object({ status: Joi.string().valid('held', 'cancelled').required() });

const params = Joi.object({ id: uuid.required() });
const followUpParams = Joi.object({ id: uuid.required(), followUpId: uuid.required() });
const meetingParams = Joi.object({ id: uuid.required(), meetingId: uuid.required() });

const query = Joi.object({
  status: Joi.string().valid('new', 'in_progress', 'closed'),
  search: Joi.string().trim().max(100).allow(''),
  // Sans limite, toutes les lignes : le back office et les exports Excel doivent tout voir.
  limit: Joi.number().integer().min(1).max(5000),
  offset: Joi.number().integer().min(0).default(0),
});

module.exports = { createPublic, createManual, update, followUp, meeting, meetingStatus, params, followUpParams, meetingParams, query };
