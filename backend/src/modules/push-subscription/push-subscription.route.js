const express = require('express');
const asyncHandler = require('../../shared/async-handler');
const validate = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const pushSubscriptionValidation = require('./push-subscription.validation');
const pushSubscriptionController = require('./push-subscription.controller');

const router = express.Router();

router.get('/public-key', asyncHandler(pushSubscriptionController.publicKey));

router.use(asyncHandler(authenticate));
router.post('/', validate(pushSubscriptionValidation.subscribe), asyncHandler(pushSubscriptionController.subscribe));
router.delete('/', validate(pushSubscriptionValidation.unsubscribe), asyncHandler(pushSubscriptionController.unsubscribe));

module.exports = router;
