const env = require('../../config/env');
const mailer = require('../../shared/mailer');

const roleLabels = {
  'super-admin': 'super administrateur',
  admin: 'administrateur',
  occupant: 'occupant',
  animateur: 'animateur',
};

// Prévient la personne que son accès est prêt : adresse de l'espace équipe et marche à suivre.
// Le mot de passe n'est jamais envoyé : il est transmis par l'administrateur ou choisi avec « Mot de passe oublié ».
const sendWelcome = (user) => mailer.send({
  to: user.email,
  subject: 'Votre accès à l’espace équipe HubInvest',
  text: [
    `Bonjour ${user.firstName},`,
    '',
    roleLabels[user.role] ? `Un compte ${roleLabels[user.role]} vient d’être créé pour vous sur HubInvest.` : 'Un compte vient d’être créé pour vous sur HubInvest.',
    '',
    `Connectez-vous ici : ${env.appUrls.backoffice}/connexion`,
    `Identifiant : ${user.email}`,
    '',
    'Votre mot de passe vous est communiqué par la personne qui a créé votre compte.',
    'Vous pouvez aussi en choisir un vous-même avec « Mot de passe oublié » sur la page de connexion.',
    '',
    'Sur téléphone, ajoutez l’application à l’écran d’accueil et activez les notifications pour ne rien manquer.',
    '',
    'HubInvest',
  ].join('\n'),
});

module.exports = { sendWelcome };
