const Joi = require('joi');
const { SERVICE_KEYS } = require('../../shared/services');

// Heure de la journée au format HH:MM (heure de Lomé).
const timeOfDay = /^([01]\d|2[0-3]):[0-5]\d$/;
// Jour au format AAAA-MM-JJ.
const isoDay = /^\d{4}-\d{2}-\d{2}$/;

const update = Joi.object({
  contactRequestsOpen: Joi.boolean(),
  investorDeskOpen: Joi.boolean(),
  b2bOpen: Joi.boolean(),
  challengeOpen: Joi.boolean(),
  wheelOpen: Joi.boolean(),
  liveQuestionsOpen: Joi.boolean(),
  screenMode: Joi.string().valid('live', 'video'),
  screenService: Joi.string().valid('', ...SERVICE_KEYS),
  screenVideoUrl: Joi.string().trim().uri({ scheme: ['http', 'https'] }).max(500).allow(''),
  challengeRewardStock: Joi.number().integer().min(0).max(100000),
  wheelSpinsPerCode: Joi.number().integer().min(1).max(20),
  b2bTables: Joi.number().integer().min(1).max(50),
  b2bMeetingMinutes: Joi.number().integer().min(5).max(120),
  b2bDayStart: Joi.string().pattern(timeOfDay),
  b2bDayEnd: Joi.string().pattern(timeOfDay),
  studioFirstDay: Joi.string().pattern(isoDay),
  studioLastDay: Joi.string().pattern(isoDay),
  studioDayStart: Joi.string().pattern(timeOfDay),
  studioDayEnd: Joi.string().pattern(timeOfDay),
  studioSlotMinutes: Joi.number().integer().min(5).max(120),
  guichetFirstDay: Joi.string().pattern(isoDay),
  guichetLastDay: Joi.string().pattern(isoDay),
  guichetDayStart: Joi.string().pattern(timeOfDay),
  guichetDayEnd: Joi.string().pattern(timeOfDay),
  guichetSlotMinutes: Joi.number().integer().min(5).max(120),
  // Formats de tournage du Studio : la clé reste fixe pour garder les invitations déjà faites.
  studioFormats: Joi.array().min(1).max(20).items(Joi.object({
    key: Joi.string().pattern(/^[A-Za-z][A-Za-z0-9_-]{0,29}$/).required(),
    label: Joi.string().trim().min(1).max(80).required(),
    labelEn: Joi.string().trim().max(80).allow(''),
  })).unique('key'),
  investorDelayAHours: Joi.number().integer().min(1).max(720),
  investorDelayBDays: Joi.number().integer().min(1).max(90),
  // Informations de qualification de l'Investor Desk : la clé reste fixe pour garder les réponses déjà saisies.
  investorQualificationFields: Joi.array().max(30).items(Joi.object({
    key: Joi.string().pattern(/^[A-Za-z][A-Za-z0-9_-]{0,39}$/).required(),
    label: Joi.string().trim().min(1).max(120).required(),
    type: Joi.string().valid('text', 'number', 'select', 'yesno').required(),
    options: Joi.array().max(30).items(Joi.string().trim().min(1).max(80)).when('type', { is: 'select', then: Joi.array().min(1).required(), otherwise: Joi.any().strip() }),
  })).unique('key'),
}).min(1);

module.exports = { update };
