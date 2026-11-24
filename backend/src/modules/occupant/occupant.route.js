const express = require('express');
const asyncHandler = require('../../shared/async-handler');
const AppError = require('../../shared/app-error');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, requireRoles } = require('../../middlewares/auth.middleware');
const roles = require('../../shared/roles');
const { isGlobal } = require('../../shared/access');
const occupantValidation = require('./occupant.validation');
const occupantController = require('./occupant.controller');
const uploadCover = require('./occupant-cover.middleware');
const uploadLogo = require('./occupant-logo.middleware');
const uploadGalleryImage = require('./occupant-gallery.middleware');

const router = express.Router();
const adminOnly = requireRoles(roles.SUPER_ADMIN, roles.ADMIN);

// Fiche d'un stand : l'équipe API-ZF pour tous les stands, l'occupant pour le sien seulement.
const ownStand = (request, response, next) => {
  if (isGlobal(request.user)) return next();
  if (request.user?.role === roles.OCCUPANT && request.user.occupantId && request.user.occupantId === request.params.id) return next();
  return next(new AppError(403, 'FORBIDDEN', "Vous n’avez pas accès à cette action."));
};

// L'occupant modifie le contenu de sa fiche ; nom, emplacement, espace et statut restent à l'API-ZF.
const validateUpdate = (request, response, next) => validate(
  isGlobal(request.user) ? occupantValidation.update : occupantValidation.ownUpdate,
)(request, response, next);

const params = validate(occupantValidation.params, 'params');

router.get('/public', asyncHandler(occupantController.listPublic));
router.get(
  '/public/:slug',
  validate(occupantValidation.publicParams, 'params'),
  asyncHandler(occupantController.getPublic),
);

router.use(asyncHandler(authenticate));
router.get('/', adminOnly, asyncHandler(occupantController.list));
router.post('/', adminOnly, validate(occupantValidation.create), asyncHandler(occupantController.create));
router.get('/:id', params, ownStand, asyncHandler(occupantController.get));
router.patch('/:id', params, ownStand, validateUpdate, asyncHandler(occupantController.update));
router.post('/:id/cover', params, ownStand, uploadCover, asyncHandler(occupantController.updateCover));
router.post('/:id/logo', params, ownStand, uploadLogo, asyncHandler(occupantController.updateLogo));
router.post('/:id/gallery', params, ownStand, uploadGalleryImage, asyncHandler(occupantController.addGalleryImage));
router.delete(
  '/:id/gallery',
  params,
  ownStand,
  validate(occupantValidation.galleryImage),
  asyncHandler(occupantController.removeGalleryImage),
);
router.delete('/:id', adminOnly, params, asyncHandler(occupantController.remove));

module.exports = router;
