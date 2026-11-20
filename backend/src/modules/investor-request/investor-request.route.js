const express = require('express');
const asyncHandler = require('../../shared/async-handler');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, requireRoles } = require('../../middlewares/auth.middleware');
const roles = require('../../shared/roles');
const investorRequestValidation = require('./investor-request.validation');
const investorRequestController = require('./investor-request.controller');
const rateLimit = require('../../middlewares/rate-limit.middleware');

const router = express.Router();
// Guichet de l'API-ZF : réservé à son équipe (super administrateurs), pas aux administrateurs de stand.
const investorDeskOnly = requireRoles(roles.SUPER_ADMIN);

router.post(
  '/public',
  rateLimit.publicForm('investor-desk'),
  validate(investorRequestValidation.createPublic),
  asyncHandler(investorRequestController.createPublic),
);

router.use(asyncHandler(authenticate), investorDeskOnly);
router.get('/', validate(investorRequestValidation.query, 'query'), asyncHandler(investorRequestController.list));
router.post('/', validate(investorRequestValidation.createManual), asyncHandler(investorRequestController.createManual));
router.patch(
  '/:id',
  validate(investorRequestValidation.params, 'params'),
  validate(investorRequestValidation.update),
  asyncHandler(investorRequestController.update),
);

module.exports = router;
