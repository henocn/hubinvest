const crypto = require('node:crypto');
const AppError = require('../../shared/app-error');
const env = require('../../config/env');
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
  status: 'active',
  completedAt: null,
  redeemedAt: null,
  redeemedByUserId: null,
}), true);

const getPublic = async (token) => {
  const passport = await challengePassportRepository.findPublicByToken(token);
  if (!passport) throw new AppError(404, 'CHALLENGE_PASSPORT_NOT_FOUND', 'Parcours introuvable.');
  return publicPayload(passport);
};

const list = async () => (await challengePassportRepository.findAll()).map(managerPayload);

const redeem = (user, id) => sequelize.transaction(async (transaction) => {
  const passport = await challengePassportRepository.findByIdForUpdate(id, transaction);
  if (!passport) throw new AppError(404, 'CHALLENGE_PASSPORT_NOT_FOUND', 'Parcours introuvable.');
  if (passport.status === 'active') throw new AppError(409, 'CHALLENGE_NOT_COMPLETED', 'Le parcours n’est pas encore terminé.');
  if (passport.status === 'redeemed') throw new AppError(409, 'REWARD_ALREADY_REDEEMED', 'La récompense a déjà été remise.');

  const updated = await challengePassportRepository.update(passport, {
    status: 'redeemed',
    redeemedAt: new Date(),
    redeemedByUserId: user.id,
  }, transaction);
  return managerPayload(updated);
});

module.exports = { createPublic, getPublic, list, redeem, publicPayload };
