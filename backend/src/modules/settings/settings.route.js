const express = require('express');
const asyncHandler = require('../../shared/async-handler');
const { authenticate, requireRoles } = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const roles = require('../../shared/roles');
const settingsService = require('./settings.service');
const settingsValidation = require('./settings.validation');
const uploadScreenVideo = require('./screen-video.middleware');
const { importFromDrive } = require('./screen-video.drive');

const router = express.Router();

router.get('/public', (request, response) => response.json({ data: settingsService.publicSettings() }));

router.use(asyncHandler(authenticate), requireRoles(roles.SUPER_ADMIN));
router.get('/', (request, response) => response.json({ data: settingsService.current() }));
router.patch('/', validate(settingsValidation.update), asyncHandler(async (request, response) => {
  response.json({ data: await settingsService.update(request.body, request.user) });
}));

// Vidéo de repli du grand écran : un fichier chargé, ou un lien Google Drive que le serveur télécharge
// (Google refuse qu'un autre site lise une vidéo Drive directement). Le serveur web laisse 500 Mo et 10 minutes ici.
const multipartOnly = (request, response, next) => (request.is('multipart/form-data') ? uploadScreenVideo(request, response, next) : next());
router.post('/screen-video', multipartOnly, asyncHandler(async (request, response) => {
  if (!request.file && typeof request.body?.url === 'string') {
    const filename = await importFromDrive(request.body.url.trim());
    response.json({ data: await settingsService.setScreenVideo({ filename }, request.user) });
    return;
  }
  response.json({ data: await settingsService.setScreenVideo(request.file, request.user) });
}));

module.exports = router;
