const express = require('express');
const asyncHandler = require('../../shared/async-handler');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, requireAdminScope } = require('../../middlewares/auth.middleware');
const adminScopes = require('../../shared/admin-scopes');
const validation = require('./b2b-proposal.validation');
const controller = require('./b2b-proposal.controller');

const router = express.Router();
const b2bAdminOnly = requireAdminScope(adminScopes.B2B);

router.post('/public/:needId', validate(validation.needParams, 'params'), validate(validation.createPublic), asyncHandler(controller.createPublic));
router.use(asyncHandler(authenticate), b2bAdminOnly);
router.get('/need/:needId', validate(validation.needParams, 'params'), asyncHandler(controller.list));
router.patch('/:id', validate(validation.params, 'params'), validate(validation.update), asyncHandler(controller.update));

module.exports = router;
