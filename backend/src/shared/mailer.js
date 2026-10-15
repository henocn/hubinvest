const nodemailer = require('nodemailer');
const env = require('../config/env');

const hasAuthentication = () => Boolean(env.smtp.user && env.smtp.password);

// Indique si les variables SMTP minimales sont renseignées.
const isConfigured = () => Boolean(
  env.smtp.host
  && env.smtp.fromEmail
  && ((env.smtp.user && env.smtp.password) || (!env.smtp.user && !env.smtp.password)),
);

let transporter;

// Crée une seule fois le transport SMTP partagé par tous les envois.
const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      pool: true,
      ...(hasAuthentication() && { auth: { user: env.smtp.user, pass: env.smtp.password } }),
    });
  }
  return transporter;
};

// Envoie un e-mail texte depuis l'adresse d'expédition configurée.
const send = ({ to, subject, text }) => getTransporter().sendMail({
  from: { name: env.smtp.fromName, address: env.smtp.fromEmail },
  to,
  subject,
  text,
});

module.exports = { isConfigured, send };
