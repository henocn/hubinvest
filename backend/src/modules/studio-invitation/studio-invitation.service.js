const crypto = require('node:crypto');
const AppError = require('../../shared/app-error');
const studioInvitationRepository = require('./studio-invitation.repository');

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

const getPublic = async (token) => {
  const invitation = await studioInvitationRepository.findByToken(token);
  if (!invitation) throw new AppError(404, 'STUDIO_INVITATION_NOT_FOUND', 'Invitation introuvable.');
  return publicPayload(invitation);
};

const respond = async (token, status) => {
  const invitation = await studioInvitationRepository.findByToken(token);
  if (!invitation) throw new AppError(404, 'STUDIO_INVITATION_NOT_FOUND', 'Invitation introuvable.');
  const updated = await studioInvitationRepository.update(invitation, {
    status,
    respondedAt: new Date(),
  });
  return publicPayload(updated);
};

const list = () => studioInvitationRepository.findAll();

const get = async (id) => {
  const invitation = await studioInvitationRepository.findById(id);
  if (!invitation) throw new AppError(404, 'STUDIO_INVITATION_NOT_FOUND', 'Invitation introuvable.');
  return invitation;
};

const create = (user, values) => studioInvitationRepository.create({
  createdByUserId: user.id,
  token: crypto.randomBytes(32).toString('hex'),
  guestName: values.guestName,
  subject: values.subject,
  scheduledAt: values.scheduledAt,
  status: 'pending',
  respondedAt: null,
});

const update = async (id, values) => studioInvitationRepository.update(await get(id), values);

module.exports = { getPublic, respond, list, create, update };
