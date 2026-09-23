const crypto = require('node:crypto');
const AppError = require('../../shared/app-error');
const roles = require('../../shared/roles');
const { translatePublicContent } = require('../../shared/translation.service');
const studioInvitationRepository = require('./studio-invitation.repository');

const standFor = (user) => {
  if (user.role === roles.SUPER_ADMIN) return null;
  if (!user.occupantId) throw new AppError(403, 'STAND_REQUIRED', 'Cet administrateur n’est rattaché à aucun stand.');
  return user.occupantId;
};

const publicPayload = (invitation) => {
  const values = invitation.toJSON ? invitation.toJSON() : invitation;
  return {
    guestName: values.guestName,
    subject: values.subject,
    scheduledAt: values.scheduledAt,
    status: values.status,
    respondedAt: values.respondedAt,
  };
};

const getPublic = async (token, language) => {
  const invitation = await studioInvitationRepository.findByToken(token);
  if (!invitation) throw new AppError(404, 'STUDIO_INVITATION_NOT_FOUND', 'Invitation introuvable.');
  return translatePublicContent(publicPayload(invitation), ['subject'], language);
};

const respond = async (token, status, language) => {
  const invitation = await studioInvitationRepository.findByToken(token);
  if (!invitation) throw new AppError(404, 'STUDIO_INVITATION_NOT_FOUND', 'Invitation introuvable.');
  const updated = await studioInvitationRepository.update(invitation, {
    status,
    respondedAt: new Date(),
  });
  return translatePublicContent(publicPayload(updated), ['subject'], language);
};

const list = (user) => studioInvitationRepository.findAll(standFor(user));

const get = async (user, id) => {
  const invitation = await studioInvitationRepository.findById(id, standFor(user));
  if (!invitation) throw new AppError(404, 'STUDIO_INVITATION_NOT_FOUND', 'Invitation introuvable.');
  return invitation;
};

const create = async (user, values) => {
  const occupantId = standFor(user) || values.occupantId;
  if (!occupantId || !(await studioInvitationRepository.findOccupantById(occupantId))) {
    throw new AppError(422, 'OCCUPANT_REQUIRED', 'Choisissez un stand.');
  }
  return studioInvitationRepository.create({
    occupantId,
    createdByUserId: user.id,
    token: crypto.randomBytes(32).toString('hex'),
    guestName: values.guestName,
    subject: values.subject,
    scheduledAt: values.scheduledAt,
    status: 'pending',
    respondedAt: null,
  });
};

const update = async (user, id, values) => {
  const invitation = await get(user, id);
  const nextValues = { ...values };
  if (user.role === roles.ADMIN) delete nextValues.occupantId;
  if (nextValues.occupantId && !(await studioInvitationRepository.findOccupantById(nextValues.occupantId))) {
    throw new AppError(422, 'OCCUPANT_NOT_FOUND', 'Stand introuvable.');
  }
  return studioInvitationRepository.update(invitation, nextValues);
};

module.exports = { getPublic, respond, list, create, update };
