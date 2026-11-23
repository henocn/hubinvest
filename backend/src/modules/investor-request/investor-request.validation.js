const Joi = require('joi');
const { GUICHET_KEYS, CLASSIFICATIONS } = require('../../shared/guichets');
const { SERVICE_KEYS } = require('../../shared/services');

const serviceKey = Joi.string().valid(...SERVICE_KEYS).allow(null);

const uuid = Joi.string().guid({ version: ['uuidv4'] });
const guichet = Joi.string().valid(...GUICHET_KEYS);

const person = {
  fullName: Joi.string().trim().min(2).max(160).required(),
  email: Joi.string().trim().email().max(180).required(),
  phone: Joi.string().trim().min(6).max(32).allow('', null),
  organization: Joi.string().trim().max(160).allow('', null),
  guichet: guichet.default('project'),
  projectSummary: Joi.string().trim().min(10).max(6000).required(),
};

// « Être recontacté » depuis le site.
const createPublic = Joi.object({ ...person, consentApizf: Joi.boolean().valid(true).required() });

// « Prendre rendez-vous » à un guichet depuis le site : un créneau proposé.
const book = Joi.object({ ...person, projectSummary: Joi.string().trim().max(6000).allow('', null), guichet: guichet.required(), startsAt: Joi.date().iso().required(), consentApizf: Joi.boolean().valid(true).required() });
const slotsQuery = Joi.object({ guichet: guichet.required() });

// Passage au guichet ou appel, saisi par l'équipe de l'API-ZF.
const createManual = Joi.object({ ...person, consentApizf: Joi.boolean().default(false) });

// Fiche : coordonnées, guichet, classe (A·B·C ou Accompagnement) et responsable nommé. Le statut est calculé.
const update = Joi.object({
  fullName: Joi.string().trim().min(2).max(160),
  email: Joi.string().trim().email().max(180),
  phone: Joi.string().trim().min(6).max(32).allow('', null),
  organization: Joi.string().trim().max(160).allow('', null),
  guichet,
  classification: Joi.string().trim().valid(...CLASSIFICATIONS).insensitive().allow(null),
  contactUserId: uuid.allow(null),
}).min(1);

const answers = Joi.object().pattern(Joi.string().max(40), Joi.alternatives(Joi.string().trim().max(500).allow(''), Joi.number(), Joi.boolean()).allow(null));

// Fiche de diagnostic : les neuf informations, le service d'orientation, l'étape suivante (obligatoire).
const diagnosis = Joi.object({
  organization: Joi.string().trim().max(160).allow('', null),
  projectSummary: Joi.string().trim().max(6000).allow('', null),
  qualification: answers.default({}),
  recommendedService: serviceKey,
  nextAction: Joi.string().trim().min(2).max(255).required(),
});

// Fiche « Mon entreprise, mes difficultés » et engagement de suivi écrit.
const difficulty = Joi.object({
  difficulty: Joi.object({
    company: Joi.string().trim().min(2).max(160).required(),
    regime: Joi.string().valid('free_zone', 'investment_code', 'none').required(),
    nature: Joi.string().trim().min(2).max(160).required(),
    description: Joi.string().trim().min(2).max(4000).required(),
  }).required(),
  commitmentService: serviceKey,
  commitmentDueAt: Joi.date().iso().allow(null),
  commitmentNote: Joi.string().trim().min(2).max(2000).allow(null),
});

const resolve = Joi.object({ resolved: Joi.boolean().required() });

// Relance faite : moyen (appel ou message), note, étape suivante (obligatoire pour A et B, contrôlée par le service), date de la prochaine relance.
const followUp = Joi.object({
  channel: Joi.string().valid('call', 'message').required(),
  note: Joi.string().trim().max(2000).allow('', null),
  nextStep: Joi.string().trim().max(255).allow('', null),
  nextFollowUpAt: Joi.date().iso().allow(null),
  doneAt: Joi.date().iso().max('now'),
});

// Rendez-vous : date et heure ; au guichet de la personne (créneau réservé) ou dans un lieu libre.
const meeting = Joi.object({
  startsAt: Joi.date().iso().required(),
  atGuichet: Joi.boolean().default(false),
  location: Joi.when('atGuichet', { is: true, then: Joi.any().strip(), otherwise: Joi.string().trim().min(2).max(160).required() }),
});

// Valider (tenu) ou annuler un rendez-vous prévu.
const meetingStatus = Joi.object({ status: Joi.string().valid('held', 'cancelled').required() });

const params = Joi.object({ id: uuid.required() });
const followUpParams = Joi.object({ id: uuid.required(), followUpId: uuid.required() });
const meetingParams = Joi.object({ id: uuid.required(), meetingId: uuid.required() });

const query = Joi.object({
  status: Joi.string().valid('new', 'in_progress', 'closed'),
  guichet,
  search: Joi.string().trim().max(100).allow(''),
  // Sans limite, toutes les lignes : le back office et les exports Excel doivent tout voir.
  limit: Joi.number().integer().min(1).max(5000),
  offset: Joi.number().integer().min(0).default(0),
});

module.exports = { createPublic, book, slotsQuery, createManual, update, diagnosis, difficulty, resolve, followUp, meeting, meetingStatus, params, followUpParams, meetingParams, query };
