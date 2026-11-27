const express = require('express');
const asyncHandler = require('../../shared/async-handler');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, requireRoles } = require('../../middlewares/auth.middleware');
const roles = require('../../shared/roles');
const challengePassageValidation = require('./challenge-passage.validation');
const challengePassageController = require('./challenge-passage.controller');

const router = express.Router();

// Le visiteur scanne le QR posé devant un stand : deux questions, puis le passage est validé sans l'occupant.
router.post('/public/quiz', validate(challengePassageValidation.quiz), asyncHandler(challengePassageController.quiz));
router.post('/public/answer', validate(challengePassageValidation.answer), asyncHandler(challengePassageController.answer));

router.use(asyncHandler(authenticate));
router.get('/qr-codes', requireRoles(roles.SUPER_ADMIN, roles.ADMIN), asyncHandler(challengePassageController.qrCodes));
// Secours : l'occupant scanne ou tape le code du joueur.
router.get('/stats', requireRoles(roles.OCCUPANT), asyncHandler(challengePassageController.stats));
router.post('/', requireRoles(roles.OCCUPANT), validate(challengePassageValidation.create), asyncHandler(challengePassageController.create));

module.exports = router;
