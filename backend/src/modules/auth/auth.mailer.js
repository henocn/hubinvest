const env = require('../../config/env');
const mailer = require('../../shared/mailer');

// Indique si le code de réinitialisation peut être envoyé par e-mail.
const isConfigured = () => mailer.isConfigured();

// Envoie le code de réinitialisation à cinq chiffres.
const sendPasswordReset = (user, code) => mailer.send({
  to: user.email,
  subject: 'Votre code de réinitialisation HubInvest',
  text: [
    `Bonjour ${user.firstName},`,
    '',
    'Votre code de réinitialisation est :',
    code,
    '',
    `Ce code expire dans ${Math.max(1, Math.round(env.auth.passwordResetExpiresIn / 60000))} minutes.`,
    'Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.',
  ].join('\n'),
});

module.exports = { isConfigured, sendPasswordReset };
