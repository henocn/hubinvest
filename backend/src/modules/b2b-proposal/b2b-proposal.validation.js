const Joi = require('joi');

const uuid = Joi.string().guid({ version: ['uuidv4'] });
const needParams = Joi.object({ needId: uuid.required() });
const params = Joi.object({ id: uuid.required() });
const createPublic = Joi.object({
  fullName: Joi.string().trim().min(2).max(160).required(),
  email: Joi.string().trim().email().max(180).required(),
  phone: Joi.string().trim().min(6).max(32).allow('', null),
  message: Joi.string().trim().min(10).max(4000).required(),
  consentOccupant: Joi.boolean().valid(true).required(),
});
// Décision (accepter, refuser) ou correction des coordonnées et du message depuis le back office.
const update = Joi.object({
  status: Joi.string().valid('accepted', 'declined'),
  fullName: Joi.string().trim().min(2).max(160),
  email: Joi.string().trim().email().max(180),
  phone: Joi.string().trim().min(6).max(32).allow('', null),
  message: Joi.string().trim().min(10).max(4000),
}).min(1);

const meetingParams = Joi.object({ id: uuid.required(), meetingId: uuid.required() });
// Jour au format AAAA-MM-JJ.
const slotsQuery = Joi.object({ exclude: uuid, date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required() });
// Rendez-vous : créneau (date et heure ISO) et numéro de table.
const schedule = Joi.object({
  startsAt: Joi.date().iso().required(),
  tableNumber: Joi.number().integer().min(1).max(50).required(),
});
// Compte rendu en un clic, et note facultative ; une issue vide annule le compte rendu.
const report = Joi.object({
  outcome: Joi.string().valid('present', 'absent').allow(null, ''),
  note: Joi.string().trim().max(2000).allow('', null),
}).min(1);

module.exports = { needParams, params, meetingParams, slotsQuery, createPublic, update, schedule, report };
