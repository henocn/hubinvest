const express = require('express');
const asyncHandler = require('../../shared/async-handler');
const AppError = require('../../shared/app-error');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, requireRoles } = require('../../middlewares/auth.middleware');
const roles = require('../../shared/roles');
const liveQuestionService = require('./live-question.service');
const validation = require('./live-question.validation');

const router = express.Router();

// Limite par adresse contre les envois en rafale ; large, car un réseau mobile partage souvent une adresse entre plusieurs visiteurs.
const WINDOW = 10 * 60 * 1000;
const MAX_PER_WINDOW = 20;
const attempts = new Map();
const limitQuestions = (request, response, next) => {
  const now = Date.now();
  const key = request.ip;
  const recent = (attempts.get(key) || []).filter((time) => now - time < WINDOW);
  if (recent.length >= MAX_PER_WINDOW) {
    return next(new AppError(429, 'LIVE_QUESTION_RATE_LIMITED', 'Vous avez envoyé plusieurs questions. Patientez quelques minutes.'));
  }
  recent.push(now);
  attempts.set(key, recent);
  if (attempts.size > 5000) attempts.clear();
  return next();
};

router.post(
  '/public/:eventId',
  limitQuestions,
  validate(validation.eventParams, 'params'),
  validate(validation.createPublic),
  asyncHandler(async (request, response) => {
    response.status(201).json({ data: await liveQuestionService.createPublic(request.params.eventId, request.body) });
  }),
);

router.use(asyncHandler(authenticate), requireRoles(roles.SUPER_ADMIN, roles.ADMIN, roles.ANIMATOR));
router.get('/', asyncHandler(async (request, response) => response.json({ data: await liveQuestionService.list() })));
router.patch(
  '/:id',
  validate(validation.params, 'params'),
  validate(validation.update),
  asyncHandler(async (request, response) => {
    response.json({ data: await liveQuestionService.updateStatus(request.user, request.params.id, request.body.status) });
  }),
);

module.exports = router;
