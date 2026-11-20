const crypto = require('node:crypto');
const AppError = require('../../shared/app-error');
const roles = require('../../shared/roles');
const { translatePublicContent } = require('../../shared/translation.service');
const { sequelize } = require('../../models');
const challengePassportRepository = require('./challenge-passport.repository');
const { events: realtime } = require('../realtime/realtime.service');
const settingsService = require('../settings/settings.service');

const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

// Code participant de 6 caractères (les anciens codes de 8 restent acceptés aux stands).
const CODE_LENGTH = 6;
const createCode = () => Array.from({ length: CODE_LENGTH }, () => alphabet[crypto.randomInt(alphabet.length)]).join('');

const publicPayload = (passport, includeToken = false) => {
  const values = passport.toJSON ? passport.toJSON() : passport;
  const passages = values.passages || [];
  return {
    ...(includeToken && { token: values.token }),
    displayName: values.displayName,
    code: values.code,
    status: values.status,
    passageCount: passages.length,
    requiredPassages: settingsService.requiredPassages(),
    completedAt: values.completedAt,
    redeemedAt: values.redeemedAt,
    passages: passages.map((passage) => ({
      validatedAt: passage.createdAt,
      occupant: passage.occupant,
    })),
  };
};

// Vue de l'équipe : jamais le lien personnel du joueur (token), qui permet de jouer à sa place.
const managerPayload = (passport) => {
  const { token: _token, ...values } = passport.toJSON ? passport.toJSON() : passport;
  return {
    ...values,
    passageCount: (values.passages || []).length,
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
  const occupantId = user.role === roles.ADMIN ? user.occupantId : null;
  if (user.role === roles.ADMIN && !occupantId) {
    throw new AppError(403, 'STAND_REQUIRED', 'Cet administrateur n’est rattaché à aucun stand.');
  }
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

// Joueurs correspondant à une recherche (nom, e-mail, téléphone, code), pour retrouver un code perdu.
const search = async (query) => (await challengePassportRepository.search(query.trim())).map((passport) => {
  const values = passport.toJSON ? passport.toJSON() : passport;
  return { code: values.code, displayName: values.displayName, email: values.email, phone: values.phone, status: values.status };
});

module.exports = { createPublic, getPublic, list, listRewards, getByCode, redeem, redeemByCode, publicPayload, search };
