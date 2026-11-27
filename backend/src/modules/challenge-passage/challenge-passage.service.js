const { UniqueConstraintError } = require('sequelize');
const AppError = require('../../shared/app-error');
const env = require('../../config/env');
const challengePassportRepository = require('../challenge-passport/challenge-passport.repository');
const challengePassageRepository = require('./challenge-passage.repository');
const { events: realtime } = require('../realtime/realtime.service');
const settingsService = require('../settings/settings.service');
const { translatePublicContent } = require('../../shared/translation.service');
const { INDUSTRY_STEPS } = require('../../shared/challenge-steps');
const { sign, verify, sealTicket, openTicket, deskSignature } = require('../../shared/passage-sign');
const { buildQuiz, NONE } = require('./challenge-quiz');

// Après une mauvaise réponse, on attend un peu avant de nouvelles questions sur ce stand (pas d'essais en rafale).
const RETRY_SECONDS = 30;
// Deux stands validés trop vite l'un après l'autre : le visiteur n'a pas pu voir le second.
const MIN_GAP_SECONDS = 30;
const TICKET_MINUTES = 15;
const cooldowns = new Map();
const cooldownKey = (passportId, occupantId) => `${passportId}:${occupantId}`;
const cooldownLeft = (passportId, occupantId) => {
  const until = cooldowns.get(cooldownKey(passportId, occupantId)) || 0;
  return Math.max(0, Math.ceil((until - Date.now()) / 1000));
};
const startCooldown = (passportId, occupantId) => {
  if (cooldowns.size > 5000) cooldowns.forEach((until, key) => { if (until <= Date.now()) cooldowns.delete(key); });
  cooldowns.set(cooldownKey(passportId, occupantId), Date.now() + RETRY_SECONDS * 1000);
};

const stats = async (user) => {
  if (!user.occupantId) throw new AppError(403, 'OCCUPANT_REQUIRED', 'Ce compte ne dépend pas d’un occupant.');
  return { scannedPlayers: await challengePassageRepository.countByOccupant(user.occupantId) };
};

const industryPassages = (passages) => passages.filter((passage) => passage.occupant?.space !== 'apizf');

// Enregistre le passage d'un joueur sur un stand de l'Espace Industrie (QR du stand et deux questions ; plus de scan par l'occupant).
// « Trouvez les 5 étapes » : quatre stands de l'Espace Industrie, puis la cinquième étape en récupérant sa récompense
// au comptoir du Stand API-ZF ; le Stand API-ZF ne valide donc plus de passage.
const recordPassage = async ({ passport, occupantId, validatedByUserId = null, minGap = false }, transaction) => {
  if (passport.status === 'redeemed') throw new AppError(409, 'REWARD_ALREADY_REDEEMED', 'La récompense a déjà été remise.');
  if (passport.status === 'completed') throw new AppError(409, 'CHALLENGE_ALREADY_COMPLETED', 'Ce parcours est déjà terminé.');

  const occupant = await challengePassageRepository.findOccupant(occupantId, transaction);
  if (occupant?.space === 'apizf') {
    throw new AppError(409, 'CHALLENGE_APIZF_REWARD', 'Au Stand API-ZF, le joueur ne valide pas d’étape : il récupère sa récompense avec le QR du comptoir.');
  }
  const existing = await challengePassageRepository.findExisting(passport.id, occupantId, transaction);
  if (existing) throw new AppError(409, 'PASSAGE_ALREADY_VALIDATED', 'Ce stand a déjà validé ce parcours.');

  const passages = await challengePassageRepository.findByPassport(passport.id, transaction);
  const done = industryPassages(passages);
  if (done.length >= INDUSTRY_STEPS) throw new AppError(409, 'CHALLENGE_ALREADY_COMPLETED', 'Ce parcours est déjà terminé.');
  if (minGap) {
    const last = Math.max(0, ...passages.map((passage) => new Date(passage.createdAt).getTime()));
    const wait = Math.ceil((last + MIN_GAP_SECONDS * 1000 - Date.now()) / 1000);
    if (wait > 0) {
      const error = new AppError(429, 'PASSAGE_TOO_FAST', 'Prenez le temps de visiter le stand.');
      error.details = { retryIn: wait };
      throw error;
    }
  }

  await challengePassageRepository.create({ passportId: passport.id, occupantId, validatedByUserId }, transaction);
  const completed = done.length + 1 >= INDUSTRY_STEPS;
  if (completed) await challengePassportRepository.update(passport, { status: 'completed', completedAt: new Date() }, transaction);
  return { passageCount: done.length + 1, completed };
};

// Stand d'une affiche : retrouvé par son adresse, et la signature doit être celle imprimée sur l'affiche.
const standFromPoster = async (slug, signature) => {
  const stands = await challengePassageRepository.findStands();
  const stand = stands.find((item) => item.slug === slug);
  if (!stand || !verify('stand', stand.id, signature)) throw new AppError(404, 'PASSAGE_QR_INVALID', 'Ce QR code n’est pas reconnu.');
  return { stand, stands };
};

const playerFromToken = async (token) => {
  const passport = await challengePassportRepository.findPublicByToken(token);
  if (!passport) throw new AppError(422, 'CHALLENGE_PLAYER_REQUIRED', 'Identifiez-vous avant de jouer.');
  return passport;
};

// Questions du passage sur un stand (QR scanné). Les bonnes réponses partent dans un ticket signé, jamais en clair.
const quiz = async ({ slug, sig, player }, language) => {
  settingsService.assertOpen('challengeOpen');
  const { stand, stands } = await standFromPoster(slug, sig);
  const passport = await playerFromToken(player);
  const standInfo = { name: stand.name, slug: stand.slug };
  if (stand.space === 'apizf') return { status: 'apizf', stand: standInfo };
  if (['completed', 'redeemed'].includes(passport.status)) return { status: passport.status, stand: standInfo };
  if ((passport.passages || []).some((passage) => passage.occupant?.id === stand.id)) return { status: 'done', stand: standInfo };
  const wait = cooldownLeft(passport.id, stand.id);
  if (wait) return { status: 'wait', stand: standInfo, retryIn: wait };

  const questions = buildQuiz(stand, stands);
  const ticket = sealTicket({
    p: passport.id,
    o: stand.id,
    a: questions.map((question) => question.answer),
    e: Date.now() + TICKET_MINUTES * 60 * 1000,
  });
  const translated = await Promise.all(questions.map(async (question) => {
    const labels = await translatePublicContent(question.options.filter((option) => option !== NONE).map((label) => ({ label })), ['label'], language);
    return { kind: question.kind, options: [...labels.map((item) => item.label), NONE] };
  }));
  return { status: 'ready', stand: standInfo, questions: translated, ticket };
};

// Réponses aux questions : deux bonnes réponses valident le passage, sinon on réessaie dans un instant.
const answer = async ({ ticket, player, answers }) => {
  settingsService.assertOpen('challengeOpen');
  const content = openTicket(ticket);
  if (!content || content.e < Date.now()) throw new AppError(410, 'PASSAGE_QUIZ_EXPIRED', 'Ces questions ont expiré. Rescannez le QR du stand.');
  const passport = await playerFromToken(player);
  if (passport.id !== content.p) throw new AppError(403, 'PASSAGE_QUIZ_EXPIRED', 'Ces questions ont expiré. Rescannez le QR du stand.');

  const correct = content.a.length === answers.length && content.a.every((value, index) => value === answers[index]);
  if (!correct) {
    startCooldown(passport.id, content.o);
    return { correct: false, retryIn: RETRY_SECONDS };
  }

  try {
    await challengePassageRepository.sequelize.transaction(async (transaction) => {
      const locked = await challengePassportRepository.findByIdForUpdate(passport.id, transaction);
      await recordPassage({ passport: locked, occupantId: content.o, minGap: true }, transaction);
    });
  } catch (error) {
    if (error instanceof UniqueConstraintError) throw new AppError(409, 'PASSAGE_ALREADY_VALIDATED', 'Ce stand a déjà validé ce parcours.');
    throw error;
  }
  realtime.challengeChanged({ passportId: passport.id, occupantIds: [content.o] });
  return { correct: true };
};

// QR à imprimer (Paramètres) : un par stand de l'Espace Industrie, et celui du comptoir des récompenses.
const qrCodes = async () => {
  const stands = (await challengePassageRepository.findStands()).filter((stand) => stand.space !== 'apizf');
  return {
    stands: stands.map((stand) => ({
      id: stand.id,
      name: stand.name,
      standLabel: stand.standLabel,
      url: `${env.appUrls.public}/passage/${stand.slug}/${sign('stand', stand.id)}`,
    })),
    desk: { url: `${env.appUrls.public}/recuperer/${deskSignature()}` },
  };
};

module.exports = { stats, quiz, answer, qrCodes, recordPassage, RETRY_SECONDS };
