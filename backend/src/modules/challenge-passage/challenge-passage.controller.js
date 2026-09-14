const challengePassageService = require('./challenge-passage.service');

const create = async (request, response) => response.status(201).json({
  data: await challengePassageService.validate(request.user, request.body.code),
  message: 'Passage validé.',
});

module.exports = { create };
