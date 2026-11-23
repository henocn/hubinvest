const AppError = require('../../shared/app-error');
const { isGlobal } = require('../../shared/access');
const b2bNeedService = require('../b2b-need/b2b-need.service');
const b2bProposalRepository = require('./b2b-proposal.repository');
const notificationService = require('../notification/notification.service');
const { events: realtime } = require('../realtime/realtime.service');
const settingsService = require('../settings/settings.service');

const createPublic = async (needId, values, language = 'fr') => {
  settingsService.assertOpen('b2bOpen');
  if (values.consentOccupant !== true) throw new AppError(422, 'CONSENT_REQUIRED', 'Votre accord est nécessaire pour cette proposition.');
  const need = await b2bNeedService.getPublic(needId);
  const proposal = await b2bProposalRepository.create({
    b2bNeedId: needId,
    fullName: values.fullName,
    email: values.email.toLowerCase(),
    phone: values.phone || null,
    message: values.message,
    status: 'pending',
    language,
    consentOccupant: true,
    consentCapturedAt: new Date(),
    handledByUserId: null,
  });
  notificationService.b2bProposalReceived(proposal, need);
  // Le besoin public ne porte pas occupantId : le stand se lit sur need.occupant.
  realtime.b2bChanged(need.occupant.id);
  return proposal;
};

const list = async (user, needId) => {
  await b2bNeedService.getManaged(user, needId);
  return b2bProposalRepository.findAllByNeed(needId);
};

// Toutes les demandes que l’utilisateur peut traiter : toutes pour l'équipe API-ZF, celles de son stand pour un occupant.
const listAll = async (user) => {
  if (isGlobal(user)) return b2bProposalRepository.findAllVisible();
  if (!user.occupantId) throw new AppError(403, 'STAND_REQUIRED', 'Ce compte n’est rattaché à aucun stand.');
  return b2bProposalRepository.findAllVisible(user.occupantId);
};

// Une demande que l'utilisateur peut traiter : toutes pour l'équipe API-ZF, celles de son stand pour un occupant.
const getManaged = async (user, id) => {
  const proposal = await b2bProposalRepository.findById(id);
  if (!proposal) throw new AppError(404, 'B2B_PROPOSAL_NOT_FOUND', 'Proposition B2B introuvable.');
  if (!isGlobal(user) && proposal.need.occupantId !== user.occupantId) {
    throw new AppError(404, 'B2B_PROPOSAL_NOT_FOUND', 'Proposition B2B introuvable.');
  }
  return proposal;
};

// Accepter ou refuser (la personne est prévenue par e-mail), ou corriger les coordonnées et le message.
const update = async (user, id, values) => {
  const proposal = await getManaged(user, id);
  const previousStatus = proposal.status;
  const nextValues = { ...values };
  if (nextValues.email) nextValues.email = nextValues.email.toLowerCase();
  if (nextValues.phone === '') nextValues.phone = null;
  if (nextValues.status && nextValues.status !== previousStatus) nextValues.handledByUserId = user.id;
  const updated = await b2bProposalRepository.update(proposal, nextValues);
  if (updated.status !== previousStatus) {
    notificationService.b2bProposalDecided(updated, proposal.need);
  }
  realtime.b2bChanged(proposal.need.occupantId);
  return updated;
};

const remove = async (user, id) => {
  const proposal = await getManaged(user, id);
  await b2bProposalRepository.destroy(proposal);
  realtime.b2bChanged(proposal.need.occupantId);
};

module.exports = { createPublic, list, listAll, getManaged, update, remove };
