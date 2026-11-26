const express = require('express');
const asyncHandler = require('../../shared/async-handler');
const { authenticate, requireRoles } = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const roles = require('../../shared/roles');
const settingsService = require('./settings.service');
const settingsValidation = require('./settings.validation');
const uploadScreenVideo = require('./screen-video.middleware');

const router = express.Router();

router.get('/public', (request, response) => response.json({ data: settingsService.publicSettings() }));

router.use(asyncHandler(authenticate), requireRoles(roles.SUPER_ADMIN));
router.get('/', (request, response) => response.json({ data: settingsService.current() }));
router.patch('/', validate(settingsValidation.update), asyncHandler(async (request, response) => {
  response.json({ data: await settingsService.update(request.body, request.user) });
}));

// Vidéo de repli du grand écran, chargée comme fichier.
router.post('/screen-video', uploadScreenVideo, asyncHandler(async (request, response) => {
  response.json({ data: await settingsService.setScreenVideo(request.file, request.user) });
}));

module.exports = router;
