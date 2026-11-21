const express = require('express');
const asyncHandler = require('../../shared/async-handler');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, requireRoles } = require('../../middlewares/auth.middleware');
const roles = require('../../shared/roles');
const v = require('./studio-invitation.validation');
const c = require('./studio-invitation.controller');
const rateLimit = require('../../middlewares/rate-limit.middleware');

const router = express.Router();
// Studio : l'API-ZF invite tout le monde ; un administrateur de stand invite pour son stand.
const studioTeamOnly = requireRoles(roles.SUPER_ADMIN, roles.ADMIN);
const tokenLimit = rateLimit.rateLimit({ windowMs: 15 * 60 * 1000, max: 30, key: (request) => `studio:${request.ip}:${request.params.token}` });

// Page personnelle de l'invité (lien reçu par e-mail).
router.get('/public/:token', validate(v.tokenParams, 'params'), asyncHandler(c.getPublic));
router.get('/public/:token/slots', validate(v.tokenParams, 'params'), asyncHandler(c.publicSlots));
router.post('/public/:token/booking', tokenLimit, validate(v.tokenParams, 'params'), validate(v.book), asyncHandler(c.book));
router.post('/public/:token/decline', tokenLimit, validate(v.tokenParams, 'params'), asyncHandler(c.decline));

router.use(asyncHandler(authenticate), studioTeamOnly);
router.get('/', asyncHandler(c.list));
router.post('/', validate(v.create), asyncHandler(c.create));
router.patch('/:id', validate(v.idParams, 'params'), validate(v.update), asyncHandler(c.update));
router.post('/:id/resend', validate(v.idParams, 'params'), asyncHandler(c.resend));
router.post('/:id/cancel', validate(v.idParams, 'params'), asyncHandler(c.cancel));
router.post('/:id/deliver', validate(v.idParams, 'params'), validate(v.deliver), asyncHandler(c.deliver));
router.delete('/:id', validate(v.idParams, 'params'), asyncHandler(c.remove));

module.exports = router;
