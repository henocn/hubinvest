const nodemailer = require('nodemailer');
const config = require('../config');

const { smtp } = config;
let transporter;

const isConfigured = () => Boolean(smtp.host && smtp.fromEmail && ((smtp.user && smtp.password) || (!smtp.user && !smtp.password)));

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      pool: true,
      ...(smtp.user && smtp.password && { auth: { user: smtp.user, pass: smtp.password } }),
    });
  }
  return transporter;
};

// E-mail texte depuis l'adresse d'expédition de HubInvest ; échoue si le SMTP n'est pas configuré.
const send = async (to, { subject, text }) => {
  if (!isConfigured()) throw new Error('SMTP non configuré.');
  await getTransporter().sendMail({ from: { name: smtp.fromName, address: smtp.fromEmail }, to, subject, text });
};

module.exports = { isConfigured, send };
