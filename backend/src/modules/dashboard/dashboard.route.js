const express = require('express');
const asyncHandler = require('../../shared/async-handler');
const { authenticate, requireRoles } = require('../../middlewares/auth.middleware');
const roles = require('../../shared/roles');
const dashboardService = require('./dashboard.service');

const router = express.Router();

router.get('/', asyncHandler(authenticate), requireRoles(roles.SUPER_ADMIN, roles.ADMIN, roles.OCCUPANT, roles.ANIMATOR), asyncHandler(async (request, response) => {
  response.json({ data: await dashboardService.overview(request.user) });
}));

module.exports = router;
