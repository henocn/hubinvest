const AppError = require('../../shared/app-error');
const roles = require('../../shared/roles');
const investorRequestRepository = require('./investor-request.repository');
const notificationService = require('../notification/notification.service');
const { events: realtime } = require('../realtime/realtime.service');
const settingsService = require('../settings/settings.service');

const standFor = (user) => {
  if (user.role === roles.SUPER_ADMIN) return null;
  if (!user.occupantId) throw new AppError(403, 'STAND_REQUIRED', 'Cet administrateur n’est rattaché à aucun stand.');
  return user.occupantId;
};

const list = async (user, query) => {
  const result = await investorRequestRepository.findAll({ ...query, occupantId: standFor(user) });
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
  const occupant = await investorRequestRepository.findActiveOccupantById(values.occupantId);
  if (!occupant) throw new AppError(422, 'OCCUPANT_NOT_FOUND', 'Le stand choisi n’est pas disponible.');
  const investorRequest = await investorRequestRepository.create({
    occupantId: values.occupantId,
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
  notificationService.investorRequestReceived(investorRequest, occupant);
  realtime.investorRequestsChanged(values.occupantId);
  return investorRequest;
};

// Demande saisie dans le back office : pas de module à ouvrir ni de notification.
const createManual = async (user, values) => {
  const occupantId = standFor(user) || values.occupantId;
  if (!occupantId) throw new AppError(422, 'OCCUPANT_REQUIRED', 'Choisissez le stand concerné.');
  const occupant = await investorRequestRepository.findActiveOccupantById(occupantId);
  if (!occupant) throw new AppError(422, 'OCCUPANT_NOT_FOUND', 'Le stand choisi n’est pas disponible.');
  const investorRequest = await investorRequestRepository.create({
    occupantId,
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
  realtime.investorRequestsChanged(occupantId);
  return investorRequest;
};

const update = async (user, id, values) => {
  const investorRequest = await investorRequestRepository.findById(id, standFor(user));
  if (!investorRequest) {
    throw new AppError(404, 'INVESTOR_REQUEST_NOT_FOUND', 'Demande introuvable.');
  }

  const updated = await investorRequestRepository.update(investorRequest, values);
  realtime.investorRequestsChanged(investorRequest.occupantId);
  return updated;
};

module.exports = { list, createPublic, createManual, update };
