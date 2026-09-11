const express = require('express');
const asyncHandler = require('../../shared/async-handler');
const healthController = require('./health.controller');

const router = express.Router();

router.get('/', healthController.application);
router.get('/database', asyncHandler(healthController.database));

module.exports = router;
