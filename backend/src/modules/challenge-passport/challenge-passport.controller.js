const challengePassportService = require('./challenge-passport.service');
const publicLanguage = require('../../shared/public-language');

const createPublic = async (request, response) => response.status(201).json({
  data: await challengePassportService.createPublic(request.body),
  message: 'Parcours créé.',
});

const getPublic = async (request, response) => response.json({
  data: await challengePassportService.getPublic(request.params.token, publicLanguage(request)),
});

const list = async (request, response) => response.json({
  data: await challengePassportService.list(request.user),
});

const listRewards = async (request, response) => response.json({
  data: await challengePassportService.listRewards(request.user),
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

const search = async (request, response) => response.json({ data: await challengePassportService.search(request.query.q) });

module.exports = { createPublic, getPublic, list, listRewards, getByCode, redeem, redeemByCode, search };
