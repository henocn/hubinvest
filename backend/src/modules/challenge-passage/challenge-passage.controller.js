const challengePassageService = require('./challenge-passage.service');
const publicLanguage = require('../../shared/public-language');

const create = async (request, response) => response.status(201).json({
  data: await challengePassageService.validate(request.user, request.body),
  message: 'Passage validé.',
});

const stats = async (request, response) => response.json({
  data: await challengePassageService.stats(request.user),
});

// QR d'un stand : les deux questions du passage.
const quiz = async (request, response) => response.json({
  data: await challengePassageService.quiz(request.body, publicLanguage(request)),
});

const answer = async (request, response) => response.json({
  data: await challengePassageService.answer(request.body),
});

// Affiches QR à imprimer, depuis les Paramètres.
const qrCodes = async (request, response) => response.json({ data: await challengePassageService.qrCodes() });

module.exports = { create, stats, quiz, answer, qrCodes };
