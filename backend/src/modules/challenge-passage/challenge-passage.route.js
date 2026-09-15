const express = require('express');
const asyncHandler = require('../../shared/async-handler');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, requireRoles } = require('../../middlewares/auth.middleware');
const roles = require('../../shared/roles');
const challengePassageValidation = require('./challenge-passage.validation');
const challengePassageController = require('./challenge-passage.controller');

const router = express.Router();
const occupantTeamOnly = requireRoles(roles.OCCUPANT);

router.use(asyncHandler(authenticate), occupantTeamOnly);
router.get('/stats', asyncHandler(challengePassageController.stats));
router.post('/', validate(challengePassageValidation.create), asyncHandler(challengePassageController.create));

module.exports = router;
