const express = require('express');
const asyncHandler = require('../../shared/async-handler');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, requireAdminScope } = require('../../middlewares/auth.middleware');
const adminScopes = require('../../shared/admin-scopes');
const studioInvitationValidation = require('./studio-invitation.validation');
const studioInvitationController = require('./studio-invitation.controller');

const router = express.Router();
const studioTeamOnly = requireAdminScope(adminScopes.CAMPAIGN);

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
