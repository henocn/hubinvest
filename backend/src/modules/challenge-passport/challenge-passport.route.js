const express = require('express');
const asyncHandler = require('../../shared/async-handler');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, requireRoles } = require('../../middlewares/auth.middleware');
const roles = require('../../shared/roles');
const challengePassportValidation = require('./challenge-passport.validation');
const challengePassportController = require('./challenge-passport.controller');

const router = express.Router();
const challengeTeamOnly = requireRoles(roles.SUPER_ADMIN, roles.ADMIN_APIZF, roles.ANIMATOR);

router.post('/public', validate(challengePassportValidation.createPublic), asyncHandler(challengePassportController.createPublic));
router.get('/public/:token', validate(challengePassportValidation.tokenParams, 'params'), asyncHandler(challengePassportController.getPublic));

router.use(asyncHandler(authenticate), challengeTeamOnly);
router.get('/', asyncHandler(challengePassportController.list));
router.patch('/:id/redeem', validate(challengePassportValidation.idParams, 'params'), asyncHandler(challengePassportController.redeem));

module.exports = router;
