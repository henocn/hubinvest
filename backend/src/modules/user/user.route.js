const express = require('express');
const asyncHandler = require('../../shared/async-handler');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, requireRoles } = require('../../middlewares/auth.middleware');
const roles = require('../../shared/roles');
const userValidation = require('./user.validation');
const userController = require('./user.controller');

const router = express.Router();
const adminOnly = requireRoles(roles.SUPER_ADMIN, roles.ADMIN_APIZF);

router.use(asyncHandler(authenticate));
router.get('/me', asyncHandler(userController.getProfile));
router.patch('/me/password', validate(userValidation.changePassword), asyncHandler(userController.changePassword));

router.use(adminOnly);
router.get('/', asyncHandler(userController.list));
router.post('/', validate(userValidation.create), asyncHandler(userController.create));
router.get('/:id', validate(userValidation.params, 'params'), asyncHandler(userController.get));
router.patch(
  '/:id',
  validate(userValidation.params, 'params'),
  validate(userValidation.update),
  asyncHandler(userController.update),
);
router.delete(
  '/:id',
  validate(userValidation.params, 'params'),
  asyncHandler(userController.remove),
);

module.exports = router;
