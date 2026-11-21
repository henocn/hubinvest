const studioInvitationService = require('./studio-invitation.service');
const publicLanguage = require('../../shared/public-language');

// Page personnelle de l'invité.
const getPublic = async (request, response) => response.json({ data: await studioInvitationService.getPublic(request.params.token, publicLanguage(request)) });
const publicSlots = async (request, response) => response.json({ data: await studioInvitationService.publicSlots(request.params.token) });
const book = async (request, response) => response.json({ data: await studioInvitationService.book(request.params.token, request.body.startsAt, publicLanguage(request)), message: 'Créneau réservé.' });
const decline = async (request, response) => response.json({ data: await studioInvitationService.decline(request.params.token, publicLanguage(request)), message: 'Réponse enregistrée.' });

// Équipe : invitations, envoi, annulation, livraison de la capsule.
const list = async (request, response) => response.json({ data: await studioInvitationService.list(request.user) });
const formats = (request, response) => response.json({ data: studioInvitationService.formats() });
const create = async (request, response) => response.status(201).json({ data: await studioInvitationService.create(request.user, request.body), message: 'Invitation envoyée.' });
const update = async (request, response) => response.json({ data: await studioInvitationService.update(request.user, request.params.id, request.body), message: 'Invitation mise à jour.' });
const resend = async (request, response) => response.json({ data: await studioInvitationService.resend(request.user, request.params.id), message: 'Invitation renvoyée.' });
const cancel = async (request, response) => response.json({ data: await studioInvitationService.cancel(request.user, request.params.id), message: 'Passage annulé.' });
const deliver = async (request, response) => response.json({ data: await studioInvitationService.deliver(request.user, request.params.id, request.body), message: 'Capsule envoyée.' });

const remove = async (request, response) => {
  await studioInvitationService.remove(request.user, request.params.id);
  response.json({ message: 'Invitation supprimée.' });
};

module.exports = { getPublic, publicSlots, book, decline, list, formats, create, update, resend, cancel, deliver, remove };
