const { UniqueConstraintError } = require('sequelize');
const AppError = require('../../shared/app-error');
const challengePassportRepository = require('../challenge-passport/challenge-passport.repository');
const challengePassageRepository = require('./challenge-passage.repository');
const { events: realtime } = require('../realtime/realtime.service');
const settingsService = require('../settings/settings.service');
const { CHALLENGE_STEPS, INDUSTRY_STEPS } = require('../../shared/challenge-steps');


const stats = async (user) => {
  if (!user.occupantId) throw new AppError(403, 'OCCUPANT_REQUIRED', 'Ce compte ne dépend pas d’un occupant.');
  return { scannedPlayers: await challengePassageRepository.countByOccupant(user.occupantId) };
};

const validate = async (user, values) => {
  settingsService.assertOpen('challengeOpen');
  if (!user.occupantId) throw new AppError(403, 'OCCUPANT_REQUIRED', 'Ce compte ne dépend pas d’un occupant.');
  const { code } = values;
  let passportId = null;

  try {
    const result = await challengePassageRepository.sequelize.transaction(async (transaction) => {
      const passport = await challengePassportRepository.findByCodeForUpdate(code, transaction);
      if (!passport) throw new AppError(404, 'CHALLENGE_PASSPORT_NOT_FOUND', 'Code participant introuvable.');
      if (passport.status === 'redeemed') throw new AppError(409, 'REWARD_ALREADY_REDEEMED', 'La récompense a déjà été remise.');
      if (passport.status === 'completed') throw new AppError(409, 'CHALLENGE_ALREADY_COMPLETED', 'Ce parcours est déjà terminé.');

      const existing = await challengePassageRepository.findExisting(passport.id, user.occupantId, transaction);
      if (existing) throw new AppError(409, 'PASSAGE_ALREADY_VALIDATED', 'Ce stand a déjà validé ce parcours.');
      passportId = passport.id;

      // « Trouvez les 5 étapes » : quatre étapes sur quatre stands de l'Espace Industrie, la cinquième au Stand API-ZF.
      const occupant = await challengePassageRepository.findOccupant(user.occupantId, transaction);
      const passages = await challengePassageRepository.findByPassport(passport.id, transaction);
      const industryDone = passages.filter((passage) => passage.occupant?.space !== 'apizf').length;
      if (occupant?.space === 'apizf' && industryDone < INDUSTRY_STEPS) {
        throw new AppError(409, 'CHALLENGE_APIZF_LAST', `L’étape 5 se valide au Stand API-ZF après les ${INDUSTRY_STEPS} étapes de l’Espace Industrie (${industryDone} sur ${INDUSTRY_STEPS}).`);
      }
      if (occupant?.space !== 'apizf' && industryDone >= INDUSTRY_STEPS) {
        throw new AppError(409, 'CHALLENGE_FINISH_AT_APIZF', 'Les quatre étapes de l’Espace Industrie sont validées : la dernière se valide au Stand API-ZF.');
      }

      await challengePassageRepository.create({
        passportId: passport.id,
        occupantId: user.occupantId,
        validatedByUserId: user.id,
      }, transaction);

      const passageCount = await challengePassageRepository.countByPassport(passport.id, transaction);
      const completed = passageCount >= CHALLENGE_STEPS;
      if (completed) {
        await challengePassportRepository.update(passport, {
          status: 'completed',
          completedAt: new Date(),
        }, transaction);
      }

      return {
        displayName: passport.displayName,
        code: passport.code,
        passageCount,
        requiredPassages: settingsService.requiredPassages(),
        status: completed ? 'completed' : 'active',
      };
    });
    // Publié après la validation de la transaction : les écrans rechargent des données déjà enregistrées.
    realtime.challengeChanged({ passportId, occupantIds: [user.occupantId] });
    return result;
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      throw new AppError(409, 'PASSAGE_ALREADY_VALIDATED', 'Ce stand a déjà validé ce parcours.');
    }
    throw error;
  }
};

module.exports = { validate, stats };
