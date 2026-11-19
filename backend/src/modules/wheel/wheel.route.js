const express = require('express');
const asyncHandler = require('../../shared/async-handler');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, requireRoles } = require('../../middlewares/auth.middleware');
const roles = require('../../shared/roles');
const AppError = require('../../shared/app-error');
const wheelValidation = require('./wheel.validation');
const wheelController = require('./wheel.controller');

const router = express.Router();

// Limite les essais de codes erronés par adresse : seuls les échecs comptent,
// car beaucoup de visiteurs peuvent partager la même adresse sur le réseau mobile.
const failedSpins = new Map();
const failureWindow = 15 * 60 * 1000;
const maxFailures = 20;
const limitFailedSpins = (request, response, next) => {
  const now = Date.now();
  const current = failedSpins.get(request.ip);
  if (current && current.expiresAt > now && current.count >= maxFailures) {
    return next(new AppError(429, 'WHEEL_RATE_LIMITED', 'Trop de codes erronés. Réessayez dans quelques minutes.'));
  }
  response.on('finish', () => {
    if (![404, 409, 410].includes(response.statusCode)) return;
    if (failedSpins.size > 5000) failedSpins.forEach((entry, key) => { if (entry.expiresAt <= Date.now()) failedSpins.delete(key); });
    const entry = failedSpins.get(request.ip);
    if (!entry || entry.expiresAt <= Date.now()) failedSpins.set(request.ip, { count: 1, expiresAt: Date.now() + failureWindow });
    else entry.count += 1;
  });
  return next();
};

router.get('/public', asyncHandler(wheelController.getPublic));
router.post('/public/spin', limitFailedSpins, validate(wheelValidation.spin), asyncHandler(wheelController.spin));

router.use(asyncHandler(authenticate));
// Les équipes des stands délivrent aussi des codes ; toute l'équipe peut remettre un lot gagné.
router.post('/codes', requireRoles(roles.SUPER_ADMIN, roles.ADMIN, roles.OCCUPANT), asyncHandler(wheelController.generateCode));
const prizeTeam = requireRoles(roles.SUPER_ADMIN, roles.ADMIN, roles.OCCUPANT, roles.ANIMATOR);
router.get('/prizes/:code', prizeTeam, validate(wheelValidation.codeParams, 'params'), asyncHandler(wheelController.findPrize));
router.post('/prizes/:code/claim', prizeTeam, validate(wheelValidation.codeParams, 'params'), asyncHandler(wheelController.claimPrize));

router.use(requireRoles(roles.SUPER_ADMIN, roles.ADMIN));
router.get('/', asyncHandler(wheelController.overview));
router.get('/plays', asyncHandler(wheelController.listPlays));
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
