const express = require('express');
const asyncHandler = require('../../shared/async-handler');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, requireRoles } = require('../../middlewares/auth.middleware');
const roles = require('../../shared/roles');
const AppError = require('../../shared/app-error');
const { isApizfTeam } = require('../../shared/access');
const wheelValidation = require('./wheel.validation');
const wheelController = require('./wheel.controller');

const router = express.Router();

router.get('/public', asyncHandler(wheelController.getPublic));
// Tours restants du joueur, avant d'afficher la roue.
router.post('/public/status', validate(wheelValidation.status), asyncHandler(wheelController.status));
// Pas de code à deviner : pas de limite d'essais par adresse (beaucoup de visiteurs partagent la même sur le réseau mobile).
router.post('/public/spin', validate(wheelValidation.spin), asyncHandler(wheelController.spin));

router.use(asyncHandler(authenticate));
// Roue : seule l'API-ZF remet les lots (équipe API-ZF, occupants du Stand API-ZF, animateurs pour les lots).
const forbidden = () => new AppError(403, 'FORBIDDEN', "Vous n’avez pas accès à cette action.");
const wheelTeam = (request, response, next) => next(isApizfTeam(request.user) ? undefined : forbidden());
const prizeTeam = (request, response, next) => next(isApizfTeam(request.user) || request.user?.role === roles.ANIMATOR ? undefined : forbidden());
router.get('/prizes/:code', prizeTeam, validate(wheelValidation.codeParams, 'params'), asyncHandler(wheelController.findPrize));
router.post('/prizes/:code/claim', prizeTeam, validate(wheelValidation.codeParams, 'params'), asyncHandler(wheelController.claimPrize));
// Bouton « Remis » de l'historique du back office : un tour précis.
router.post('/plays/:id/claim', wheelTeam, validate(wheelValidation.idParams, 'params'), asyncHandler(wheelController.claimPlay));

// L'historique et les codes : l'API-ZF ; les cases et les lots se règlent par le super administrateur.
router.get('/', wheelTeam, asyncHandler(wheelController.overview));

router.use(requireRoles(roles.SUPER_ADMIN));
router.delete('/plays/:id', validate(wheelValidation.idParams, 'params'), asyncHandler(wheelController.removePlay));
router.post('/segments', validate(wheelValidation.createSegment), asyncHandler(wheelController.createSegment));
router.patch(
  '/segments/:id',
  validate(wheelValidation.idParams, 'params'),
  validate(wheelValidation.updateSegment),
  asyncHandler(wheelController.updateSegment),
);
router.delete(
  '/segments/:id',
  validate(wheelValidation.idParams, 'params'),
  asyncHandler(wheelController.removeSegment),
);

module.exports = router;
