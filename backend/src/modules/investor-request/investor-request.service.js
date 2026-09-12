const AppError = require('../../shared/app-error');
const investorRequestRepository = require('./investor-request.repository');

const list = async (query) => {
  const result = await investorRequestRepository.findAll(query);
  return {
    items: result.rows,
    pagination: {
      total: result.count,
      limit: query.limit,
      offset: query.offset,
    },
  };
};

const createPublic = (values) => investorRequestRepository.create({
  fullName: values.fullName,
  email: values.email.toLowerCase(),
  phone: values.phone || null,
  projectSummary: values.projectSummary,
  status: 'new',
  nextAction: null,
  assignedToUserId: null,
  consentApizf: true,
  consentCapturedAt: new Date(),
});

const update = async (user, id, values) => {
  const investorRequest = await investorRequestRepository.findById(id);
  if (!investorRequest) {
    throw new AppError(404, 'INVESTOR_REQUEST_NOT_FOUND', 'Demande introuvable.');
  }

  return investorRequestRepository.update(investorRequest, {
    ...values,
    assignedToUserId: investorRequest.assignedToUserId || user.id,
  });
};

module.exports = { list, createPublic, update };
