const express = require('express');
const whatsappService = require('./whatsapp.service');

// Webhook Meta du numéro WhatsApp de l'équipe : https://hub.investir.tg/api/whatsapp/webhook
const router = express.Router();

router.get('/webhook', (request, response) => {
  const challenge = whatsappService.verify({
    mode: request.query['hub.mode'],
    token: request.query['hub.verify_token'],
    challenge: request.query['hub.challenge'],
  });
  if (challenge === null) return response.sendStatus(403);
  return response.type('text/plain').send(String(challenge));
});

// Meta attend un 200 rapide : la réponse part, puis le message est traité.
router.post('/webhook', (request, response) => {
  if (!whatsappService.validSignature(request.rawBody, request.get('x-hub-signature-256'))) return response.sendStatus(401);
  response.sendStatus(200);
  return whatsappService.handleIncoming(request.body);
});

module.exports = router;
