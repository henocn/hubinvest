const crypto = require('node:crypto');
const AppError = require('../../shared/app-error');
const roles = require('../../shared/roles');
const { isApizfOccupant } = require('../../shared/access');
const { translatePublicContent } = require('../../shared/translation.service');
const { sequelize } = require('../../models');
const challengePassportRepository = require('./challenge-passport.repository');
const { events: realtime } = require('../realtime/realtime.service');
const settingsService = require('../settings/settings.service');
const { INDUSTRY_STEPS } = require('../../shared/challenge-steps');
const { verifyDesk } = require('../../shared/passage-sign');

const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

// Code participant de 6 caractères (les anciens codes de 8 restent acceptés aux stands).
const CODE_LENGTH = 6;
const createCode = () => Array.from({ length: CODE_LENGTH }, () => alphabet[crypto.randomInt(alphabet.length)]).join('');

// Étapes trouvées : les stands de l'Espace Industrie (4 au plus), puis la cinquième quand la récompense est récupérée.
// Les anciens passages au Stand API-ZF ne comptent plus comme étape.
const stepsDone = (values) => Math.min((values.passages || []).filter((passage) => passage.occupant?.space !== 'apizf').length, INDUSTRY_STEPS)
  + (values.status === 'redeemed' ? 1 : 0);

const publicPayload = (passport, includeToken = false) => {
  const values = passport.toJSON ? passport.toJSON() : passport;
  const passages = (values.passages || []).filter((passage) => passage.occupant?.space !== 'apizf');
  return {
    ...(includeToken && { token: values.token }),
    displayName: values.displayName,
    code: values.code,
    status: values.status,
    passageCount: stepsDone(values),
    requiredPassages: settingsService.requiredPassages(),
    completedAt: values.completedAt,
    redeemedAt: values.redeemedAt,
    passages: passages.map((passage) => ({
      validatedAt: passage.createdAt,
      occupant: passage.occupant && { name: passage.occupant.name, standLabel: passage.occupant.standLabel, space: passage.occupant.space },
    })),
  };
};

// Vue de l'équipe : jamais le lien personnel du joueur (token), qui permet de jouer à sa place.
const managerPayload = (passport) => {
  const { token: _token, ...values } = passport.toJSON ? passport.toJSON() : passport;
  return {
    ...values,
    passageCount: stepsDone(values),
    requiredPassages: settingsService.requiredPassages(),
  };
};

const createPublic = async (values) => {
  settingsService.assertOpen('challengeOpen');
  const passport = await challengePassportRepository.create({
    token: crypto.randomBytes(32).toString('hex'),
    code: createCode(),
    displayName: values.fullName,
    firstName: null,
    lastName: null,
    email: values.contact.includes('@') ? values.contact : null,
    phone: values.contact.includes('@') ? null : values.contact,
    contact: null,
    status: 'active',
    completedAt: null,
    redeemedAt: null,
    redeemedByUserId: null,
  });
  realtime.challengeChanged({ passportId: passport.id });
  return publicPayload(passport, true);
};

const getPublic = async (token, language) => {
  const passport = await challengePassportRepository.findPublicByToken(token);
  if (!passport) throw new AppError(404, 'CHALLENGE_PASSPORT_NOT_FOUND', 'Parcours introuvable.');
  const payload = publicPayload(passport);
  payload.passages = await translatePublicContent(
    payload.passages,
    ['occupant.name', 'occupant.standLabel'],
    language,
  );
  return payload;
};

const list = async (user) => {
  // Un occupant voit les joueurs passés par son stand ; l'API-ZF, dont son stand, voit tous les joueurs (remise des récompenses).
  if (user.role === roles.OCCUPANT && !user.occupantId) {
    throw new AppError(403, 'STAND_REQUIRED', 'Ce compte n’est rattaché à aucun stand.');
  }
  const occupantId = user.role === roles.OCCUPANT && !isApizfOccupant(user) ? user.occupantId : null;
  return (await challengePassportRepository.findAll(occupantId)).map(managerPayload);
};

const getByCode = async (code) => {
  const passport = await challengePassportRepository.findByCode(code);
  if (!passport) throw new AppError(404, 'CHALLENGE_PASSPORT_NOT_FOUND', 'Participant introuvable.');
  const values = managerPayload(passport);
  return {
    id: values.id,
    displayName: values.displayName,
    code: values.code,
    status: values.status,
    passageCount: values.passageCount,
    requiredPassages: values.requiredPassages,
  };
};

// Liste les récompenses remises ; seul le fait qu'une remise soit la sienne est indiqué, sans révéler les autres comptes.
const listRewards = async (user) => (await challengePassportRepository.findRedeemed()).map((passport) => ({
  id: passport.id,
  displayName: passport.displayName,
  email: passport.email,
  phone: passport.phone,
  contact: passport.contact,
  redeemedAt: passport.redeemedAt,
  redeemedByMe: passport.redeemedByUserId === user.id,
}));

const redeemPassport = async (user, passport, transaction) => {
  if (!passport) throw new AppError(404, 'CHALLENGE_PASSPORT_NOT_FOUND', 'Parcours introuvable.');
  if (passport.status === 'active') throw new AppError(409, 'CHALLENGE_NOT_COMPLETED', 'Le parcours n’est pas encore terminé.');
  if (passport.status === 'redeemed') throw new AppError(409, 'REWARD_ALREADY_REDEEMED', 'La récompense a déjà été remise.');
  const stock = settingsService.challengeRewardStock();
  if (stock && (await challengePassportRepository.countRedeemed(transaction)) >= stock) {
    throw new AppError(409, 'REWARD_OUT_OF_STOCK', 'Il ne reste plus de récompense en stock.');
  }

  const updated = await challengePassportRepository.update(passport, {
    status: 'redeemed',
    redeemedAt: new Date(),
    redeemedByUserId: user.id,
  }, transaction);
  return { payload: managerPayload(updated), passportId: passport.id };
};

// Enregistre la remise puis, une fois la transaction validée, prévient les écrans des stands traversés.
// La recherche des stands ne retarde ni ne fait échouer la remise.
const redeemAndPublish = async (work) => {
  const { payload, passportId } = await sequelize.transaction(work);
  challengePassportRepository.findOccupantIds(passportId)
    .then((occupantIds) => realtime.challengeChanged({ passportId, occupantIds }))
    .catch(() => realtime.challengeChanged({ passportId }));
  return payload;
};

const redeem = (user, id) => redeemAndPublish(async (transaction) => {
  const passport = await challengePassportRepository.findByIdForUpdate(id, transaction);
  return redeemPassport(user, passport, transaction);
});

const redeemByCode = (user, code) => redeemAndPublish(async (transaction) => {
  const passport = await challengePassportRepository.findByCodeForUpdate(code, transaction);
  return redeemPassport(user, passport, transaction);
});

// Cinquième étape : le joueur qui a trouvé ses 4 stands scanne le QR du comptoir du Stand API-ZF, et la récompense est
// marquée récupérée sans que l'équipe tape quoi que ce soit. Son téléphone affiche alors un écran vivant (heure qui
// défile) que l'équipe regarde avant de donner le lot : une capture d'écran ou un second scan ne trompent pas.
const claim = async ({ player, sig }) => {
  if (!verifyDesk(sig)) throw new AppError(404, 'REWARD_QR_INVALID', 'Ce QR code n’est pas celui du comptoir des récompenses.');
  let passportId = null;
  await sequelize.transaction(async (transaction) => {
    const passport = await challengePassportRepository.findByTokenForUpdate(player, transaction);
    if (!passport) throw new AppError(422, 'CHALLENGE_PLAYER_REQUIRED', 'Identifiez-vous avant de jouer.');
    passportId = passport.id;
    if (passport.status === 'redeemed') {
      const error = new AppError(409, 'REWARD_ALREADY_REDEEMED', 'La récompense a déjà été récupérée.');
      error.details = { redeemedAt: passport.redeemedAt };
      throw error;
    }
    if (passport.status !== 'completed') throw new AppError(409, 'CHALLENGE_NOT_COMPLETED', 'Le parcours n’est pas encore terminé.');
    const stock = settingsService.challengeRewardStock();
    if (stock && (await challengePassportRepository.countRedeemed(transaction)) >= stock) {
      throw new AppError(409, 'REWARD_OUT_OF_STOCK', 'Il ne reste plus de récompense en stock.');
    }
    await challengePassportRepository.update(passport, { status: 'redeemed', redeemedAt: new Date(), redeemedByUserId: null }, transaction);
  });
  challengePassportRepository.findOccupantIds(passportId)
    .then((occupantIds) => realtime.challengeChanged({ passportId, occupantIds }))
    .catch(() => realtime.challengeChanged({ passportId }));
  return publicPayload(await challengePassportRepository.findPublicByToken(player));
};

// Joueurs correspondant à une recherche (nom, e-mail, téléphone, code), pour retrouver un code perdu.
const search = async (query) => (await challengePassportRepository.search(query.trim())).map((passport) => {
  const values = passport.toJSON ? passport.toJSON() : passport;
  return { code: values.code, displayName: values.displayName, email: values.email, phone: values.phone, status: values.status };
});

// Supprime un participant (super administrateur) : ses passages partent avec lui ; ses parties de roue restent, sans joueur.
// Les stands traversés sont relevés avant la suppression pour rafraîchir leurs écrans.
const remove = async (id) => {
  const passport = await challengePassportRepository.findById(id);
  if (!passport) throw new AppError(404, 'CHALLENGE_PASSPORT_NOT_FOUND', 'Participant introuvable.');
  const occupantIds = await challengePassportRepository.findOccupantIds(id).catch(() => []);
  await challengePassportRepository.remove(passport);
  realtime.challengeChanged({ passportId: id, occupantIds });
};

module.exports = { createPublic, getPublic, list, listRewards, getByCode, redeem, redeemByCode, claim, publicPayload, search, remove };
