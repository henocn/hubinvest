const express = require('express');
const asyncHandler = require('../../shared/async-handler');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, requireRoles } = require('../../middlewares/auth.middleware');
const roles = require('../../shared/roles');
const validation = require('./b2b-proposal.validation');
const controller = require('./b2b-proposal.controller');
const rateLimit = require('../../middlewares/rate-limit.middleware');

const router = express.Router();
const b2bAdminOnly = requireRoles(roles.SUPER_ADMIN, roles.ADMIN);

router.post('/public/:needId', rateLimit.publicForm('b2b'), validate(validation.needParams, 'params'), validate(validation.createPublic), asyncHandler(controller.createPublic));
router.use(asyncHandler(authenticate), b2bAdminOnly);
router.get('/', asyncHandler(controller.listAll));
router.get('/need/:needId', validate(validation.needParams, 'params'), asyncHandler(controller.list));
router.patch('/:id', validate(validation.params, 'params'), validate(validation.update), asyncHandler(controller.update));
router.delete('/:id', validate(validation.params, 'params'), asyncHandler(controller.remove));

module.exports = router;
