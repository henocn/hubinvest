const express = require('express');
const asyncHandler = require('../../shared/async-handler');
const screenService = require('./screen.service');

const router = express.Router();

// Grand écran du Stand API-ZF : public, rafraîchi par l'écran lui-même.
router.get('/public', asyncHandler(async (request, response) => response.json({ data: await screenService.getPublic() })));

module.exports = router;
