const express = require('express');
const asyncHandler = require('../../shared/async-handler');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, requireAdminScope } = require('../../middlewares/auth.middleware');
const adminScopes = require('../../shared/admin-scopes');
const validation = require('./b2b-need.validation');
const controller = require('./b2b-need.controller');

const router = express.Router();
const b2bAdminOnly = requireAdminScope(adminScopes.B2B);

router.get('/public', asyncHandler(controller.listPublic));
router.get('/public/:id', validate(validation.params, 'params'), asyncHandler(controller.getPublic));
router.use(asyncHandler(authenticate), b2bAdminOnly);
router.get('/', asyncHandler(controller.list));
router.post('/', validate(validation.create), asyncHandler(controller.create));
router.patch('/:id', validate(validation.params, 'params'), validate(validation.update), asyncHandler(controller.update));

module.exports = router;
