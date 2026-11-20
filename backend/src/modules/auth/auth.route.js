const express = require('express');
const asyncHandler = require('../../shared/async-handler');
const validate = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const authValidation = require('./auth.validation');
const authController = require('./auth.controller');
const passwordResetRateLimit = require('./auth-rate-limit.middleware');
const rateLimit = require('../../middlewares/rate-limit.middleware');

const router = express.Router();

router.post('/login', rateLimit.login, validate(authValidation.login), asyncHandler(authController.login));
router.post('/forgot-password', passwordResetRateLimit.forgotPassword, validate(authValidation.forgotPassword), asyncHandler(authController.forgotPassword));
router.post('/reset-password', passwordResetRateLimit.resetPassword, validate(authValidation.resetPassword), asyncHandler(authController.resetPassword));
router.get('/me', asyncHandler(authenticate), authController.me);

module.exports = router;
