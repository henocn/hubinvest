const challengePassportService = require('./challenge-passport.service');

const createPublic = async (request, response) => response.status(201).json({
  data: await challengePassportService.createPublic(request.body),
  message: 'Parcours créé.',
});

const getPublic = async (request, response) => response.json({
  data: await challengePassportService.getPublic(request.params.token),
});

const list = async (request, response) => response.json({
  data: await challengePassportService.list(request.user),
});

const getByCode = async (request, response) => response.json({
  data: await challengePassportService.getByCode(request.params.code),
});

const redeem = async (request, response) => response.json({
  data: await challengePassportService.redeem(request.user, request.params.id),
  message: 'Récompensé(e)',
});

const redeemByCode = async (request, response) => response.json({
  data: await challengePassportService.redeemByCode(request.user, request.body.code),
  message: 'Récompense remise.',
});

module.exports = { createPublic, getPublic, list, getByCode, redeem, redeemByCode };
