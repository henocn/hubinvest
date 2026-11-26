const express = require('express');
const asyncHandler = require('../../shared/async-handler');
const validate = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const { rateLimit } = require('../../middlewares/rate-limit.middleware');
const assistantValidation = require('./assistant.validation');
const assistantService = require('./assistant.service');

const router = express.Router();

// Chaque question coûte des tokens : un compte ne peut pas en envoyer en rafale, ni sans fin dans la journée.
const message = 'Vous avez posé beaucoup de questions. Réessayez dans quelques minutes.';
const perMinutes = rateLimit({ windowMs: 5 * 60 * 1000, max: 12, key: (request) => `assistant:${request.user.id}`, message });
const perDay = rateLimit({ windowMs: 24 * 60 * 60 * 1000, max: 150, key: (request) => `assistant-day:${request.user.id}`, message: 'Vous avez atteint le nombre de questions de la journée.' });

// Tout compte de l'espace équipe : le service limite le guide et les données à ce que le compte voit.
router.use(asyncHandler(authenticate));

// L'espace équipe n'affiche l'assistant que s'il est branché.
router.get('/', (request, response) => {
  response.json({ data: { enabled: assistantService.enabled() } });
});

router.post('/messages', validate(assistantValidation.message), perDay, perMinutes, asyncHandler(async (request, response) => {
  response.json({ data: await assistantService.ask(request.user, request.body) });
}));

module.exports = router;
