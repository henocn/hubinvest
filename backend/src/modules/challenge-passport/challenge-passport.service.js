const crypto = require('node:crypto');
const AppError = require('../../shared/app-error');
const env = require('../../config/env');
const roles = require('../../shared/roles');
const { translatePublicContent } = require('../../shared/translation.service');
const { sequelize } = require('../../models');
const challengePassportRepository = require('./challenge-passport.repository');

const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const requiredPassages = Math.max(1, env.challenge.requiredPassages);

const createCode = () => Array.from(crypto.randomBytes(8), (value) => alphabet[value % alphabet.length]).join('');

const publicPayload = (passport, includeToken = false) => {
  const values = passport.toJSON ? passport.toJSON() : passport;
  const passages = values.passages || [];
  return {
    ...(includeToken && { token: values.token }),
    displayName: values.displayName,
    code: values.code,
    status: values.status,
    passageCount: passages.length,
    requiredPassages,
    completedAt: values.completedAt,
    redeemedAt: values.redeemedAt,
    passages: passages.map((passage) => ({
      validatedAt: passage.createdAt,
      occupant: passage.occupant,
    })),
  };
};

const managerPayload = (passport) => {
  const values = passport.toJSON ? passport.toJSON() : passport;
  return {
    ...values,
    passageCount: (values.passages || []).length,
    requiredPassages,
  };
};

const createPublic = async (values) => publicPayload(await challengePassportRepository.create({
  token: crypto.randomBytes(32).toString('hex'),
  code: createCode(),
  displayName: values.displayName,
  contact: values.contact,
  status: 'active',
  completedAt: null,
  redeemedAt: null,
  redeemedByUserId: null,
}), true);

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

const redeemPassport = async (user, passport, transaction) => {
  if (!passport) throw new AppError(404, 'CHALLENGE_PASSPORT_NOT_FOUND', 'Parcours introuvable.');
  if (passport.status === 'active') throw new AppError(409, 'CHALLENGE_NOT_COMPLETED', 'Le parcours n’est pas encore terminé.');
  if (passport.status === 'redeemed') throw new AppError(409, 'REWARD_ALREADY_REDEEMED', 'La récompense a déjà été remise.');

  const updated = await challengePassportRepository.update(passport, {
    status: 'redeemed',
    redeemedAt: new Date(),
    redeemedByUserId: user.id,
  }, transaction);
  return managerPayload(updated);
};

const redeem = (user, id) => sequelize.transaction(async (transaction) => {
  const passport = await challengePassportRepository.findByIdForUpdate(id, transaction);
  return redeemPassport(user, passport, transaction);
});

const redeemByCode = (user, code) => sequelize.transaction(async (transaction) => {
  const passport = await challengePassportRepository.findByCodeForUpdate(code, transaction);
  return redeemPassport(user, passport, transaction);
});

module.exports = { createPublic, getPublic, list, getByCode, redeem, redeemByCode, publicPayload };
