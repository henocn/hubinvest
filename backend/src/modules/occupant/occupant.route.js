const express = require('express');
const asyncHandler = require('../../shared/async-handler');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, requireRoles } = require('../../middlewares/auth.middleware');
const roles = require('../../shared/roles');
const occupantValidation = require('./occupant.validation');
const occupantController = require('./occupant.controller');
const uploadCover = require('./occupant-cover.middleware');
const uploadLogo = require('./occupant-logo.middleware');
const uploadGalleryImage = require('./occupant-gallery.middleware');

const router = express.Router();
const adminOnly = requireRoles(roles.SUPER_ADMIN);

router.get('/public', asyncHandler(occupantController.listPublic));
router.get(
  '/public/:slug',
  validate(occupantValidation.publicParams, 'params'),
  asyncHandler(occupantController.getPublic),
);

router.use(asyncHandler(authenticate));
router.get('/', adminOnly, asyncHandler(occupantController.list));
router.use(adminOnly);
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
router.post(
  '/:id/logo',
  validate(occupantValidation.params, 'params'),
  uploadLogo,
  asyncHandler(occupantController.updateLogo),
);
router.post(
  '/:id/gallery',
  validate(occupantValidation.params, 'params'),
  uploadGalleryImage,
  asyncHandler(occupantController.addGalleryImage),
);
router.delete(
  '/:id/gallery',
  validate(occupantValidation.params, 'params'),
  validate(occupantValidation.galleryImage),
  asyncHandler(occupantController.removeGalleryImage),
);
router.delete(
  '/:id',
  validate(occupantValidation.params, 'params'),
  asyncHandler(occupantController.remove),
);

module.exports = router;
