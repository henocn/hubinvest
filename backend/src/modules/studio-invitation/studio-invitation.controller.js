const studioInvitationService = require('./studio-invitation.service');

const getPublic = async (request, response) => response.json({
  data: await studioInvitationService.getPublic(request.params.token),
});

const respond = async (request, response) => response.json({
  data: await studioInvitationService.respond(request.params.token, request.body.status),
  message: 'Réponse enregistrée.',
});

const list = async (request, response) => response.json({
  data: await studioInvitationService.list(),
});

const create = async (request, response) => response.status(201).json({
  data: await studioInvitationService.create(request.user, request.body),
  message: 'Invitation créée.',
});

const update = async (request, response) => response.json({
  data: await studioInvitationService.update(request.params.id, request.body),
  message: 'Invitation mise à jour.',
});

module.exports = { getPublic, respond, list, create, update };
