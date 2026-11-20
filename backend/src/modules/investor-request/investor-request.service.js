const AppError = require('../../shared/app-error');
const investorRequestRepository = require('./investor-request.repository');
const notificationService = require('../notification/notification.service');
const { events: realtime } = require('../realtime/realtime.service');
const settingsService = require('../settings/settings.service');

// L'Investor Desk est le guichet de l'API-ZF : toutes les demandes lui reviennent, aucune n'est rattachée à un stand.
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

const createPublic = async (values, language = 'fr') => {
  settingsService.assertOpen('investorDeskOpen');
  const investorRequest = await investorRequestRepository.create({
    fullName: values.fullName,
    email: values.email.toLowerCase(),
    phone: values.phone || null,
    projectSummary: values.projectSummary,
    status: 'new',
    nextAction: null,
    language,
    consentApizf: true,
    consentCapturedAt: new Date(),
  });
  notificationService.investorRequestReceived(investorRequest);
  realtime.investorRequestsChanged();
  return investorRequest;
};

// Demande saisie dans le back office (rencontre au guichet, appel…) : pas de module à ouvrir ni de notification.
const createManual = async (values) => {
  const investorRequest = await investorRequestRepository.create({
    fullName: values.fullName,
    email: values.email.toLowerCase(),
    phone: values.phone || null,
    projectSummary: values.projectSummary,
    status: values.status,
    nextAction: values.nextAction || null,
    language: 'fr',
    consentApizf: values.consentApizf,
    consentCapturedAt: new Date(),
  });
  realtime.investorRequestsChanged();
  return investorRequest;
};

const update = async (id, values) => {
  const investorRequest = await investorRequestRepository.findById(id);
  if (!investorRequest) {
    throw new AppError(404, 'INVESTOR_REQUEST_NOT_FOUND', 'Demande introuvable.');
  }
  const updated = await investorRequestRepository.update(investorRequest, values);
  realtime.investorRequestsChanged();
  return updated;
};

module.exports = { list, createPublic, createManual, update };
