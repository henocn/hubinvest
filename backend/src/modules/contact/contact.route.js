const express = require('express');
const asyncHandler = require('../../shared/async-handler');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, requireRoles } = require('../../middlewares/auth.middleware');
const roles = require('../../shared/roles');
const contactValidation = require('./contact.validation');
const contactController = require('./contact.controller');

const router = express.Router();

router.use(
  asyncHandler(authenticate),
  requireRoles(roles.OCCUPANT_MANAGER, roles.OCCUPANT_MEMBER),
);
router.get('/', validate(contactValidation.query, 'query'), asyncHandler(contactController.list));
router.post('/', validate(contactValidation.create), asyncHandler(contactController.create));
router.get('/stats', asyncHandler(contactController.stats));
router.get('/:id', validate(contactValidation.params, 'params'), asyncHandler(contactController.get));
router.patch(
  '/:id',
  validate(contactValidation.params, 'params'),
  validate(contactValidation.update),
  asyncHandler(contactController.update),
);

module.exports = router;
