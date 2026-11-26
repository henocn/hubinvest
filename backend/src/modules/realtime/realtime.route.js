const express = require('express');
const Joi = require('joi');
const asyncHandler = require('../../shared/async-handler');
const validate = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const challengePassportValidation = require('../challenge-passport/challenge-passport.validation');
const realtimeController = require('./realtime.controller');

const router = express.Router();
const streamQuery = Joi.object({ ticket: Joi.string().pattern(/^[A-Za-z0-9_-]{16,64}$/).required() });

router.get('/stream', validate(streamQuery, 'query'), asyncHandler(realtimeController.stream));
router.get('/passports/:token', validate(challengePassportValidation.tokenParams, 'params'), asyncHandler(realtimeController.passportStream));
router.get('/screen', asyncHandler(realtimeController.screenStream));
router.post('/ticket', asyncHandler(authenticate), asyncHandler(realtimeController.ticket));

module.exports = router;
