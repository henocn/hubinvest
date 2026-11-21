const Joi = require('joi');
const { STUDIO_FORMATS } = require('../../models/studio-invitation.model');

const uuid = Joi.string().guid({ version: ['uuidv4'] });

const tokenParams = Joi.object({ token: Joi.string().hex().length(64).required() });
const idParams = Joi.object({ id: uuid.required() });

// Invitation personnelle : l'e-mail est obligatoire, c'est par lui que l'invité reçoit son lien et ses rappels.
const fields = {
  occupantId: uuid.allow(null),
  guestName: Joi.string().trim().min(2).max(160),
  email: Joi.string().trim().email().max(180),
  phone: Joi.string().trim().min(6).max(32).allow('', null),
  organization: Joi.string().trim().max(160).allow('', null),
  format: Joi.string().valid(...STUDIO_FORMATS),
  subject: Joi.string().trim().max(180).allow('', null),
  language: Joi.string().valid('fr', 'en'),
};

const create = Joi.object({
  ...fields,
  guestName: fields.guestName.required(),
  email: fields.email.required(),
  format: fields.format.required(),
  language: fields.language.default('fr'),
});

const update = Joi.object(fields).min(1);

// L'invité réserve un créneau proposé.
const book = Joi.object({ startsAt: Joi.date().iso().required() });

// Livraison de la capsule : le lien de la vidéo (Drive, YouTube…).
const deliver = Joi.object({ capsuleUrl: Joi.string().trim().uri({ scheme: ['http', 'https'] }).max(500).required() });

module.exports = { tokenParams, idParams, create, update, book, deliver };
