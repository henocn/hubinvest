const studioInvitationService = require('./studio-invitation.service');
const publicLanguage = require('../../shared/public-language');

const getPublic = async (request, response) => response.json({
  data: await studioInvitationService.getPublic(request.params.token, publicLanguage(request)),
});

const respond = async (request, response) => response.json({
  data: await studioInvitationService.respond(request.params.token, request.body.status, publicLanguage(request)),
  message: 'Réponse enregistrée.',
});

const list = async (request, response) => response.json({
  data: await studioInvitationService.list(request.user),
});

const create = async (request, response) => response.status(201).json({
  data: await studioInvitationService.create(request.user, request.body),
  message: 'Invitation créée.',
});

const update = async (request, response) => response.json({
  data: await studioInvitationService.update(request.user, request.params.id, request.body),
  message: 'Invitation mise à jour.',
});

module.exports = { getPublic, respond, list, create, update };
