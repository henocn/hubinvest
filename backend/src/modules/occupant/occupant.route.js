const express = require('express');
const asyncHandler = require('../../shared/async-handler');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, requireRoles } = require('../../middlewares/auth.middleware');
const roles = require('../../shared/roles');
const occupantValidation = require('./occupant.validation');
const occupantController = require('./occupant.controller');
const uploadCover = require('./occupant-cover.middleware');

const router = express.Router();
const adminOnly = requireRoles(roles.SUPER_ADMIN, roles.ADMIN_APIZF);

router.get('/public', asyncHandler(occupantController.listPublic));
router.get(
  '/public/:slug',
  validate(occupantValidation.publicParams, 'params'),
  asyncHandler(occupantController.getPublic),
);

router.use(asyncHandler(authenticate), adminOnly);
router.get('/', asyncHandler(occupantController.list));
router.post('/', validate(occupantValidation.create), asyncHandler(occupantController.create));
router.get('/:id', validate(occupantValidation.params, 'params'), asyncHandler(occupantController.get));
router.patch(
  '/:id',
  validate(occupantValidation.params, 'params'),
  validate(occupantValidation.update),
  asyncHandler(occupantController.update),
);
router.post(
  '/:id/cover',
  validate(occupantValidation.params, 'params'),
  uploadCover,
  asyncHandler(occupantController.updateCover),
);
router.delete(
  '/:id',
  validate(occupantValidation.params, 'params'),
  asyncHandler(occupantController.remove),
);

module.exports = router;
