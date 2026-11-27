const wheelService = require('./wheel.service');
const publicLanguage = require('../../shared/public-language');

// Renvoie les cases visibles sur la roue publique.
const getPublic = async (request, response) => response.json({
  data: await wheelService.listPublic(publicLanguage(request)),
});

// Tours restants du joueur identifié, avant d'afficher la roue.
const status = async (request, response) => response.json({ data: await wheelService.status(request.body) });

const spin = async (request, response) => response.json({
  data: await wheelService.spin(request.body, publicLanguage(request)),
});

// Renvoie les cases, l'historique des codes et les chiffres de la roue.
const overview = async (request, response) => response.json({
  data: await wheelService.overview(),
});

const findPrize = async (request, response) => response.json({
  data: await wheelService.findPrize(request.params.code),
});

const claimPlay = async (request, response) => response.json({
  data: await wheelService.claimPlay(request.user, request.params.id),
});

const removePlay = async (request, response) => {
  await wheelService.removePlay(request.params.id);
  response.json({ message: 'Partie supprimée.' });
};

const claimPrize = async (request, response) => response.json({
  data: await wheelService.claimPrize(request.user, request.params.code),
});

const createSegment = async (request, response) => response.status(201).json({
  data: await wheelService.createSegment(request.body),
  message: 'Case ajoutée à la roue.',
});

const updateSegment = async (request, response) => response.json({
  data: await wheelService.updateSegment(request.params.id, request.body),
  message: 'Case de la roue mise à jour.',
});

const removeSegment = async (request, response) => {
  await wheelService.removeSegment(request.params.id);
  response.json({ message: 'Case retirée de la roue.' });
};

module.exports = { getPublic, status, spin, overview, findPrize, claimPrize, claimPlay, removePlay, createSegment, updateSegment, removeSegment };
