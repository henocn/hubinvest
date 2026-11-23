const express = require('express');
const asyncHandler = require('../../shared/async-handler');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, requireRoles } = require('../../middlewares/auth.middleware');
const roles = require('../../shared/roles');
const contactValidation = require('./contact.validation');
const contactController = require('./contact.controller');
const rateLimit = require('../../middlewares/rate-limit.middleware');

const router = express.Router();

router.post(
  '/public/:slug',
  rateLimit.publicForm('contact'),
  validate(contactValidation.publicParams, 'params'),
  validate(contactValidation.createPublic),
  asyncHandler(contactController.createPublic),
);

router.get(
  '/admin/stats',
  asyncHandler(authenticate),
  requireRoles(roles.SUPER_ADMIN),
  asyncHandler(contactController.adminStats),
);

router.get(
  '/admin/stands/:occupantId',
  asyncHandler(authenticate),
  requireRoles(roles.SUPER_ADMIN),
  validate(contactValidation.standParams, 'params'),
  asyncHandler(contactController.standContacts),
);

router.use(
  asyncHandler(authenticate),
  requireRoles(roles.OCCUPANT),
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
