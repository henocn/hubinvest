const express = require('express');
const asyncHandler = require('../../shared/async-handler');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, requireRoles } = require('../../middlewares/auth.middleware');
const roles = require('../../shared/roles');
const AppError = require('../../shared/app-error');
const { isApizfTeam } = require('../../shared/access');
const challengePassportValidation = require('./challenge-passport.validation');
const challengePassportController = require('./challenge-passport.controller');
const rateLimit = require('../../middlewares/rate-limit.middleware');

const router = express.Router();
const challengeManagers = requireRoles(roles.SUPER_ADMIN, roles.ADMIN, roles.OCCUPANT);
// Remise des récompenses : l'API-ZF (dont les occupants du Stand API-ZF, quand l'animateur n'est pas là) et les animateurs.
const rewardTeamOnly = (request, response, next) => next(isApizfTeam(request.user) || request.user?.role === roles.ANIMATOR
  ? undefined
  : new AppError(403, 'FORBIDDEN', "Vous n’avez pas accès à cette action."));

router.post('/public', rateLimit.publicForm('challenge'), validate(challengePassportValidation.createPublic), asyncHandler(challengePassportController.createPublic));
router.post('/public/claim', validate(challengePassportValidation.claim), asyncHandler(challengePassportController.claim));
router.get('/public/:token', validate(challengePassportValidation.tokenParams, 'params'), asyncHandler(challengePassportController.getPublic));

router.use(asyncHandler(authenticate));
router.get('/', challengeManagers, asyncHandler(challengePassportController.list));
// Code perdu : l'équipe retrouve le joueur par son nom, son e-mail ou son téléphone.
router.get('/search', requireRoles(roles.SUPER_ADMIN, roles.ADMIN, roles.ANIMATOR, roles.OCCUPANT), validate(challengePassportValidation.searchQuery, 'query'), asyncHandler(challengePassportController.search));
router.get('/rewards', rewardTeamOnly, asyncHandler(challengePassportController.listRewards));
router.get('/code/:code', rewardTeamOnly, validate(challengePassportValidation.rewardCodeParams, 'params'), asyncHandler(challengePassportController.getByCode));
router.post('/redeem-by-code', rewardTeamOnly, validate(challengePassportValidation.rewardCode), asyncHandler(challengePassportController.redeemByCode));
router.patch('/:id/redeem', rewardTeamOnly, validate(challengePassportValidation.idParams, 'params'), asyncHandler(challengePassportController.redeem));
// Suppression d'un participant : super administrateur seulement.
router.delete('/:id', requireRoles(roles.SUPER_ADMIN, roles.ADMIN), validate(challengePassportValidation.idParams, 'params'), asyncHandler(challengePassportController.remove));

module.exports = router;
