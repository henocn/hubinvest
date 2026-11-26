const Anthropic = require('@anthropic-ai/sdk').default;
const env = require('../../config/env');

// Le modèle de l'agent (API Anthropic). Un seul client, créé au premier appel ; la clé ne quitte pas le serveur.
let client = null;

const create = (params) => {
  if (!client) client = new Anthropic({ apiKey: env.assistant.apiKey, timeout: env.assistant.timeout, maxRetries: 2 });
  return client.messages.create(params);
};

module.exports = { create };
