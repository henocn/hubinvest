const nodemailer = require('nodemailer');
const env = require('../../config/env');

const hasAuthentication = Boolean(env.smtp.user && env.smtp.password);

const isConfigured = () => Boolean(
  env.smtp.host
  && env.smtp.fromEmail
  && ((env.smtp.user && env.smtp.password) || (!env.smtp.user && !env.smtp.password)),
);

let transporter;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      ...(hasAuthentication && { auth: { user: env.smtp.user, pass: env.smtp.password } }),
    });
  }
  return transporter;
};

const sendPasswordReset = (user, code) => getTransporter().sendMail({
  from: { name: env.smtp.fromName, address: env.smtp.fromEmail },
  to: user.email,
  subject: 'Votre code de réinitialisation HubInvest',
  text: [
    `Bonjour ${user.firstName},`,
    '',
    'Votre code de réinitialisation est :',
    code,
    '',
    `Ce lien expire dans ${Math.max(1, Math.round(env.auth.passwordResetExpiresIn / 60000))} minutes.`,
    'Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.',
  ].join('\n'),
});

module.exports = { isConfigured, sendPasswordReset };
