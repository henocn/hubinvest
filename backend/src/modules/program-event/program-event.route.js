const express = require('express');
const asyncHandler = require('../../shared/async-handler');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, requireRoles } = require('../../middlewares/auth.middleware');
const roles = require('../../shared/roles');
const programEventValidation = require('./program-event.validation');
const programEventController = require('./program-event.controller');

const router = express.Router();

router.get('/public/today', asyncHandler(programEventController.getToday));

router.use(asyncHandler(authenticate), requireRoles(roles.SUPER_ADMIN));
router.get('/', asyncHandler(programEventController.list));
router.post('/', validate(programEventValidation.create), asyncHandler(programEventController.create));
router.patch(
  '/:id',
  validate(programEventValidation.idParams, 'params'),
  validate(programEventValidation.update),
  asyncHandler(programEventController.update),
);
router.delete(
  '/:id',
  validate(programEventValidation.idParams, 'params'),
  asyncHandler(programEventController.remove),
);

module.exports = router;
