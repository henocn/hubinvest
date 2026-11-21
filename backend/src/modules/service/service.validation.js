const Joi = require('joi');
const { SERVICE_STAGES } = require('../../models/service.model');
const { PROCEDURE_DOMAINS } = require('../../models/online-procedure.model');

const uuid = Joi.string().guid({ version: ['uuidv4'] });
const idParams = Joi.object({ id: uuid.required() });

const serviceFields = {
  stage: Joi.number().integer().valid(...SERVICE_STAGES),
  title: Joi.string().trim().min(2).max(120),
  promise: Joi.string().trim().min(2).max(600),
  place: Joi.string().trim().max(240).allow('', null),
  limited: Joi.boolean(),
  published: Joi.boolean(),
};

const procedureFields = {
  title: Joi.string().trim().min(2).max(200),
  domain: Joi.string().valid(...PROCEDURE_DOMAINS),
  url: Joi.string().trim().uri({ scheme: ['http', 'https'] }).max(500).allow('', null),
  published: Joi.boolean(),
};

const createService = Joi.object({ ...serviceFields, stage: serviceFields.stage.required(), title: serviceFields.title.required(), promise: serviceFields.promise.required() });
const updateService = Joi.object(serviceFields).min(1);
const createProcedure = Joi.object({ ...procedureFields, title: procedureFields.title.required(), domain: procedureFields.domain.required() });
const updateProcedure = Joi.object(procedureFields).min(1);
const reorder = Joi.object({ ids: Joi.array().items(uuid).min(1).max(100).unique().required() });

module.exports = { idParams, createService, updateService, createProcedure, updateProcedure, reorder };
