const Joi = require('joi');

// Une question, et les derniers échanges gardés par l'écran pour que l'assistant suive le fil.
const message = Joi.object({
  message: Joi.string().trim().min(1).max(1500).required(),
  history: Joi.array().max(8).default([]).items(Joi.object({
    role: Joi.string().valid('user', 'assistant').required(),
    content: Joi.string().trim().min(1).max(3000).required(),
  })),
});

module.exports = { message };
