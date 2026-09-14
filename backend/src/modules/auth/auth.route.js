const express = require('express');
const asyncHandler = require('../../shared/async-handler');
const validate = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const authValidation = require('./auth.validation');
const authController = require('./auth.controller');

const router = express.Router();

router.post('/login', validate(authValidation.login), asyncHandler(authController.login));
router.get('/me', asyncHandler(authenticate), authController.me);

module.exports = router;
