const AppError = require('../../shared/app-error');
const b2bNeedService = require('../b2b-need/b2b-need.service');
const b2bProposalRepository = require('./b2b-proposal.repository');

const createPublic = async (needId, values) => {
  if (values.consentOccupant !== true) throw new AppError(422, 'CONSENT_REQUIRED', 'Votre accord est nécessaire pour cette proposition.');
  await b2bNeedService.getPublic(needId);
  return b2bProposalRepository.create({
    b2bNeedId: needId,
    fullName: values.fullName,
    email: values.email.toLowerCase(),
    phone: values.phone || null,
    message: values.message,
    status: 'pending',
    consentOccupant: true,
    consentCapturedAt: new Date(),
    handledByUserId: null,
  });
};

const list = async (user, needId) => {
  await b2bNeedService.getManaged(user, needId);
  return b2bProposalRepository.findAllByNeed(needId);
};

const update = async (user, id, values) => {
  const proposal = await b2bProposalRepository.findById(id);
  if (!proposal) throw new AppError(404, 'B2B_PROPOSAL_NOT_FOUND', 'Proposition B2B introuvable.');
  if (user.role === 'admin' && proposal.need.occupantId !== user.occupantId) {
    throw new AppError(404, 'B2B_PROPOSAL_NOT_FOUND', 'Proposition B2B introuvable.');
  }
  return b2bProposalRepository.update(proposal, { ...values, handledByUserId: user.id });
};

module.exports = { createPublic, list, update };
