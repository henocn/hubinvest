const express = require('express');
const asyncHandler = require('../../shared/async-handler');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, requireRoles } = require('../../middlewares/auth.middleware');
const roles = require('../../shared/roles');
const v = require('./service.validation');
const c = require('./service.controller');

const router = express.Router();

// Accueil « Nos services » du site public.
router.get('/public', asyncHandler(c.getPublic));

// Le super administrateur gère les services et les démarches en ligne.
router.use(asyncHandler(authenticate), requireRoles(roles.SUPER_ADMIN));
router.get('/', asyncHandler(c.list));
router.put('/order', validate(v.reorder), asyncHandler(c.services.reorder));
router.put('/procedures/order', validate(v.reorder), asyncHandler(c.procedures.reorder));
router.post('/procedures', validate(v.createProcedure), asyncHandler(c.procedures.create));
router.patch('/procedures/:id', validate(v.idParams, 'params'), validate(v.updateProcedure), asyncHandler(c.procedures.update));
router.delete('/procedures/:id', validate(v.idParams, 'params'), asyncHandler(c.procedures.remove));
router.post('/', validate(v.createService), asyncHandler(c.services.create));
router.patch('/:id', validate(v.idParams, 'params'), validate(v.updateService), asyncHandler(c.services.update));
router.delete('/:id', validate(v.idParams, 'params'), asyncHandler(c.services.remove));

module.exports = router;
