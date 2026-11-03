const express = require('express');
const asyncHandler = require('../../shared/async-handler');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, requireRoles } = require('../../middlewares/auth.middleware');
const roles = require('../../shared/roles');
const challengePassportValidation = require('./challenge-passport.validation');
const challengePassportController = require('./challenge-passport.controller');

const router = express.Router();
const challengeManagers = requireRoles(roles.SUPER_ADMIN, roles.ADMIN);
const rewardTeamOnly = requireRoles(roles.SUPER_ADMIN, roles.ANIMATOR);

router.post('/public', validate(challengePassportValidation.createPublic), asyncHandler(challengePassportController.createPublic));
router.get('/public/:token', validate(challengePassportValidation.tokenParams, 'params'), asyncHandler(challengePassportController.getPublic));

router.use(asyncHandler(authenticate));
router.get('/', challengeManagers, asyncHandler(challengePassportController.list));
router.get('/rewards', rewardTeamOnly, asyncHandler(challengePassportController.listRewards));
router.get('/code/:code', rewardTeamOnly, validate(challengePassportValidation.rewardCodeParams, 'params'), asyncHandler(challengePassportController.getByCode));
router.post('/redeem-by-code', rewardTeamOnly, validate(challengePassportValidation.rewardCode), asyncHandler(challengePassportController.redeemByCode));
router.patch('/:id/redeem', rewardTeamOnly, validate(challengePassportValidation.idParams, 'params'), asyncHandler(challengePassportController.redeem));

module.exports = router;
