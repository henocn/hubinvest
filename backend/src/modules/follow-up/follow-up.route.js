const express = require('express');
const Joi = require('joi');
const asyncHandler = require('../../shared/async-handler');
const AppError = require('../../shared/app-error');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, requireRoles } = require('../../middlewares/auth.middleware');
const roles = require('../../shared/roles');
const { isApizfTeam } = require('../../shared/access');
const investorValidation = require('../investor-request/investor-request.validation');
const followUpService = require('./follow-up.service');

// Page Relances : onglet Contacts (les stands), onglet Guichets (l'équipe API-ZF et les occupants du Stand API-ZF).
const router = express.Router();
const uuid = Joi.string().guid({ version: ['uuidv4'] });
const idParams = Joi.object({ id: uuid.required() });
const contactParams = Joi.object({ contactId: uuid.required() });
const apizfTeamOnly = (request, response, next) => next(isApizfTeam(request.user) ? undefined : new AppError(403, 'FORBIDDEN', 'Vous n’avez pas accès à cette action.'));

router.use(asyncHandler(authenticate), requireRoles(roles.SUPER_ADMIN, roles.ADMIN, roles.OCCUPANT));

router.get('/contacts', asyncHandler(async (request, response) => {
  response.json({ data: await followUpService.listContacts(request.user) });
}));
router.post('/contacts/:contactId', validate(contactParams, 'params'), validate(investorValidation.followUp), asyncHandler(async (request, response) => {
  response.status(201).json({ data: await followUpService.addContact(request.user, request.params.contactId, request.body) });
}));
router.patch('/contacts/:id', validate(idParams, 'params'), validate(investorValidation.followUpDone), asyncHandler(async (request, response) => {
  response.json({ data: await followUpService.completeContact(request.user, request.params.id, request.body) });
}));
router.delete('/contacts/:id', validate(idParams, 'params'), asyncHandler(async (request, response) => {
  await followUpService.removeContact(request.user, request.params.id);
  response.status(204).send();
}));

// Les relances des guichets se marquent faites et se suppriment depuis leurs routes habituelles (/investor-requests).
router.get('/guichets', apizfTeamOnly, asyncHandler(async (request, response) => {
  response.json({ data: await followUpService.listGuichets() });
}));

module.exports = router;
