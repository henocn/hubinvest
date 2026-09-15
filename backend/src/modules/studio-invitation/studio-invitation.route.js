const express = require('express');
const asyncHandler = require('../../shared/async-handler');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, requireRoles } = require('../../middlewares/auth.middleware');
const roles = require('../../shared/roles');
const studioInvitationValidation = require('./studio-invitation.validation');
const studioInvitationController = require('./studio-invitation.controller');

const router = express.Router();
const studioTeamOnly = requireRoles(roles.SUPER_ADMIN, roles.ADMIN);

router.get(
  '/public/:token',
  validate(studioInvitationValidation.tokenParams, 'params'),
  asyncHandler(studioInvitationController.getPublic),
);
router.patch(
  '/public/:token',
  validate(studioInvitationValidation.tokenParams, 'params'),
  validate(studioInvitationValidation.respond),
  asyncHandler(studioInvitationController.respond),
);

router.use(asyncHandler(authenticate), studioTeamOnly);
router.get('/', asyncHandler(studioInvitationController.list));
router.post('/', validate(studioInvitationValidation.create), asyncHandler(studioInvitationController.create));
router.patch(
  '/:id',
  validate(studioInvitationValidation.idParams, 'params'),
  validate(studioInvitationValidation.update),
  asyncHandler(studioInvitationController.update),
);

module.exports = router;
