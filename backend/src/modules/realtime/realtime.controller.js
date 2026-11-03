const AppError = require('../../shared/app-error');
const challengePassportRepository = require('../challenge-passport/challenge-passport.repository');
const realtimeService = require('./realtime.service');

// Délivre un jeton court pour ouvrir le flux du compte connecté.
const ticket = async (request, response) => response.status(201).json({
  data: realtimeService.issueTicket(request.user, request.tokenExpiresAt),
});

// Ouvre le flux d'événements d'un compte.
const stream = async (request, response) => {
  await realtimeService.openUserStream(request, response, request.query.ticket);
};

// Ouvre le flux public d'un parcours Défis.
const passportStream = async (request, response) => {
  const passport = await challengePassportRepository.findIdByToken(request.params.token);
  if (!passport) throw new AppError(404, 'CHALLENGE_PASSPORT_NOT_FOUND', 'Parcours introuvable.');
  realtimeService.openPassportStream(request, response, passport);
};

module.exports = { ticket, stream, passportStream };
