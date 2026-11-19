const wheelService = require('./wheel.service');
const publicLanguage = require('../../shared/public-language');

// Renvoie les cases visibles sur la roue publique.
const getPublic = async (request, response) => response.json({
  data: await wheelService.listPublic(publicLanguage(request)),
});

// Fait tourner la roue avec un code à usage unique.
const spin = async (request, response) => response.json({
  data: await wheelService.spin(request.body, publicLanguage(request)),
});

// Renvoie les cases, les derniers codes et les chiffres de la roue.
const overview = async (request, response) => response.json({
  data: await wheelService.overview(),
});

// Délivre un nouveau code de jeu.
const listPlays = async (request, response) => response.json({
  data: await wheelService.listPlays(),
});

const generateCode = async (request, response) => response.status(201).json({
  data: await wheelService.generateCode(request.user),
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

module.exports = { getPublic, spin, overview, listPlays, generateCode, createSegment, updateSegment, removeSegment };
