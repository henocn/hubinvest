const express = require('express');
const asyncHandler = require('../../shared/async-handler');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, requireRoles } = require('../../middlewares/auth.middleware');
const roles = require('../../shared/roles');
const investorRequestValidation = require('./investor-request.validation');
const investorRequestController = require('./investor-request.controller');
const rateLimit = require('../../middlewares/rate-limit.middleware');

const router = express.Router();
// Guichets et registre unique de l'API-ZF : réservés à son équipe (super administrateurs), pas aux administrateurs de stand.
const investorDeskOnly = requireRoles(roles.SUPER_ADMIN);

router.post(
  '/public',
  rateLimit.publicForm('investor-desk'),
  validate(investorRequestValidation.createPublic),
  asyncHandler(investorRequestController.createPublic),
);

router.get('/public/slots', validate(investorRequestValidation.slotsQuery, 'query'), asyncHandler(investorRequestController.publicSlots));
router.post(
  '/public/booking',
  rateLimit.publicForm('guichet-booking'),
  validate(investorRequestValidation.book),
  asyncHandler(investorRequestController.book),
);

router.use(asyncHandler(authenticate), investorDeskOnly);
router.get('/', validate(investorRequestValidation.query, 'query'), asyncHandler(investorRequestController.list));
router.post('/', validate(investorRequestValidation.createManual), asyncHandler(investorRequestController.createManual));
const v = investorRequestValidation;
const c = investorRequestController;
router.get('/:id', validate(v.params, 'params'), asyncHandler(c.detail));
router.get('/:id/diagnosis.pdf', validate(v.params, 'params'), asyncHandler(c.diagnosisPdf));
router.put('/:id/diagnosis', validate(v.params, 'params'), validate(v.diagnosis), asyncHandler(c.saveDiagnosis));
router.put('/:id/difficulty', validate(v.params, 'params'), validate(v.difficulty), asyncHandler(c.saveDifficulty));
router.patch('/:id/resolution', validate(v.params, 'params'), validate(v.resolve), asyncHandler(c.resolve));
router.post('/:id/follow-ups', validate(v.params, 'params'), validate(v.followUp), asyncHandler(c.addFollowUp));
router.delete('/:id/follow-ups/:followUpId', validate(v.followUpParams, 'params'), asyncHandler(c.removeFollowUp));
router.post('/:id/meetings', validate(v.params, 'params'), validate(v.meeting), asyncHandler(c.addMeeting));
router.put('/:id/meetings/:meetingId', validate(v.meetingParams, 'params'), validate(v.meeting), asyncHandler(c.updateMeeting));
router.patch('/:id/meetings/:meetingId', validate(v.meetingParams, 'params'), validate(v.meetingStatus), asyncHandler(c.setMeetingStatus));
router.delete('/:id/meetings/:meetingId', validate(v.meetingParams, 'params'), asyncHandler(c.removeMeeting));
router.patch(
  '/:id',
  validate(investorRequestValidation.params, 'params'),
  validate(investorRequestValidation.update),
  asyncHandler(investorRequestController.update),
);

module.exports = router;
