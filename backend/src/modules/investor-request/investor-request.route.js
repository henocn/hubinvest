const express = require('express');
const asyncHandler = require('../../shared/async-handler');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, requireRoles } = require('../../middlewares/auth.middleware');
const roles = require('../../shared/roles');
const investorRequestValidation = require('./investor-request.validation');
const investorRequestController = require('./investor-request.controller');

const router = express.Router();
const investorDeskOnly = requireRoles(roles.SUPER_ADMIN, roles.ADMIN);

router.post(
  '/public',
  validate(investorRequestValidation.createPublic),
  asyncHandler(investorRequestController.createPublic),
);

router.use(asyncHandler(authenticate), investorDeskOnly);
router.get('/', validate(investorRequestValidation.query, 'query'), asyncHandler(investorRequestController.list));
router.patch(
  '/:id',
  validate(investorRequestValidation.params, 'params'),
  validate(investorRequestValidation.update),
  asyncHandler(investorRequestController.update),
);

module.exports = router;
