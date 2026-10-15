const pushSubscriptionService = require('./push-subscription.service');

// Renvoie la clé publique VAPID et l'état du service.
const publicKey = async (request, response) => response.json({
  data: pushSubscriptionService.publicKey(),
});

// Abonne l'appareil de l'utilisateur connecté.
const subscribe = async (request, response) => response.status(201).json({
  data: await pushSubscriptionService.subscribe(request.user, request.body),
  message: 'Notifications activées.',
});

// Désabonne l'appareil de l'utilisateur connecté.
const unsubscribe = async (request, response) => response.json({
  data: await pushSubscriptionService.unsubscribe(request.user, request.body),
  message: 'Notifications désactivées.',
});

module.exports = { publicKey, subscribe, unsubscribe };
