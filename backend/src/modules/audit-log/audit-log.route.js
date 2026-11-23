const express = require('express');
const Joi = require('joi');
const asyncHandler = require('../../shared/async-handler');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, requireRoles } = require('../../middlewares/auth.middleware');
const roles = require('../../shared/roles');
const auditLogService = require('./audit-log.service');

// Journal des actions : consultable par le super administrateur uniquement.
const router = express.Router();
const query = Joi.object({
  search: Joi.string().trim().max(100).allow(''),
  limit: Joi.number().integer().min(1).max(5000).default(1000),
  offset: Joi.number().integer().min(0).default(0),
});

router.get('/', asyncHandler(authenticate), requireRoles(roles.SUPER_ADMIN), validate(query, 'query'), asyncHandler(async (request, response) => {
  response.json({ data: await auditLogService.list(request.query) });
}));

module.exports = router;
