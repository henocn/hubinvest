const programEventService = require('./program-event.service');
const publicLanguage = require('../../shared/public-language');

// Renvoie le contenu public de l'accueil pour la journée en cours.
const getToday = async (request, response) => response.json({
  data: await programEventService.getToday(publicLanguage(request)),
});

// Renvoie tout le programme au super administrateur.
const list = async (request, response) => response.json({
  data: await programEventService.list(),
});

// Ajoute un élément au programme.
const create = async (request, response) => response.status(201).json({
  data: await programEventService.create(request.body),
  message: 'Élément ajouté au programme.',
});

// Modifie un élément du programme.
const update = async (request, response) => response.json({
  data: await programEventService.update(request.params.id, request.body),
  message: 'Programme mis à jour.',
});

// Retire un élément du programme.
const remove = async (request, response) => {
  await programEventService.remove(request.params.id);
  response.json({ message: 'Élément retiré du programme.' });
};

module.exports = { getToday, list, create, update, remove };
