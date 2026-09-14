const challengePassageService = require('./challenge-passage.service');

const create = async (request, response) => response.status(201).json({
  data: await challengePassageService.validate(request.user, request.body.code),
  message: 'Passage validé.',
});

const stats = async (request, response) => response.json({
  data: await challengePassageService.stats(request.user),
});

module.exports = { create, stats };
