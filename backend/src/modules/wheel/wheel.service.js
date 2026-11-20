const crypto = require('node:crypto');
const { UniqueConstraintError } = require('sequelize');
const AppError = require('../../shared/app-error');
const { translatePublicContent } = require('../../shared/translation.service');
const wheelRepository = require('./wheel.repository');
const { events: realtime } = require('../realtime/realtime.service');
const settingsService = require('../settings/settings.service');

// Lettres et chiffres sans ambiguïté à l'oral ou à l'écrit (pas de 0/O, 1/I/L).
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 4;

const plain = (value) => (value?.toJSON ? value.toJSON() : value);

const remainingOf = (segment) => (segment.kind === 'prize' ? Math.max((segment.quantity || 0) - (segment.awarded || 0), 0) : null);

// Une case figure sur la roue si elle est active et, pour un lot, s'il en reste.
const isDrawable = (segment) => segment.isActive && (segment.kind === 'lose' || remainingOf(segment) > 0);

// Répartit les cases perdantes entre les lots pour qu'elles ne se suivent pas sur la roue.
const arrange = (segments) => {
  const prizes = segments.filter((segment) => segment.kind === 'prize');
  const losing = segments.filter((segment) => segment.kind === 'lose');
  const total = prizes.length + losing.length;
  const losingSlots = new Set(losing.map((_segment, index) => Math.floor(((index + 0.5) * total) / losing.length)));
  let prizeIndex = 0;
  let losingIndex = 0;
  return Array.from({ length: total }, (_value, slot) => (losingSlots.has(slot) ? losing[losingIndex++] : prizes[prizeIndex++]));
};

const publicSegment = (segment) => ({ id: segment.id, kind: segment.kind, label: segment.label, sponsor: segment.sponsor || null });

const adminSegment = (segment) => {
  const values = plain(segment);
  return { ...values, remaining: remainingOf(values), drawable: isDrawable(values) };
};

const translateSegments = (segments, language) => translatePublicContent(segments, ['label'], language);

// Renvoie les cases visibles sur la roue publique.
const listPublic = async (language) => {
  const segments = arrange((await wheelRepository.findActiveSegments()).map(plain).filter(isDrawable));
  return { segments: await translateSegments(segments.map(publicSegment), language) };
};

const normalizeCode = (value) => String(value || '').trim().toUpperCase().replace(/[\s-]/g, '');

// Tire une case au hasard parmi celles visibles : le tour est enregistré et le stock décompté dans la même transaction.
// Seul un joueur identifié peut jouer. Un code n'expire pas : il donne le nombre de tours fixé à sa création
// et appartient au premier joueur qui l'utilise.
const spin = async ({ code: rawCode, player }, language, randomIndex = crypto.randomInt) => {
  settingsService.assertOpen('wheelOpen');
  const code = normalizeCode(rawCode);
  const outcome = await wheelRepository.sequelize.transaction(async (transaction) => {
    const passport = await wheelRepository.findPlayerByToken(player, transaction);
    if (!passport) throw new AppError(422, 'WHEEL_PLAYER_REQUIRED', 'Identifiez-vous avant de jouer.');
    // Limite de tours par joueur et par jour (heure de Lomé, UTC) : vérifiée avant d'utiliser le code, qui reste valable.
    const perDay = settingsService.wheelPlaysPerDay();
    if (perDay > 0) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      if (await wheelRepository.countPlayerPlaysSince(passport.id, today, transaction) >= perDay) {
        throw new AppError(429, 'WHEEL_DAILY_LIMIT', 'Vous avez déjà joué aujourd’hui. Revenez demain !');
      }
    }
    const wheelCode = await wheelRepository.findCodeForUpdate(code, transaction);
    if (!wheelCode) throw new AppError(404, 'WHEEL_CODE_INVALID', 'Ce code n’existe pas. Vérifiez-le auprès de l’équipe du stand.');
    const plays = await wheelRepository.findCodePlays(wheelCode.id, transaction);
    if (plays.length >= wheelCode.spinsAllowed) throw new AppError(409, 'WHEEL_CODE_USED', 'Ce code a déjà servi. Demandez-en un nouveau à l’équipe du stand.');
    if (plays.some((play) => play.passportId && play.passportId !== passport.id)) {
      throw new AppError(409, 'WHEEL_CODE_TAKEN', 'Ce code a déjà été utilisé par un autre joueur. Demandez-en un nouveau à l’équipe du stand.');
    }

    const segments = arrange((await wheelRepository.findActiveSegmentsForUpdate(transaction)).filter(isDrawable));
    if (!segments.length) throw new AppError(409, 'WHEEL_EMPTY', 'La roue n’est pas encore prête. Revenez dans un instant.');

    const chosen = segments[randomIndex(segments.length)];
    if (chosen.kind === 'prize') await wheelRepository.recordAward(chosen, transaction);
    await wheelRepository.createPlay({
      wheelCodeId: wheelCode.id,
      passportId: passport.id,
      segmentId: chosen.id,
      resultKind: chosen.kind,
      resultLabel: chosen.label,
      resultSponsor: chosen.sponsor || null,
      playedAt: new Date(),
    }, transaction);

    return {
      code,
      result: publicSegment(chosen),
      segments: segments.map(publicSegment),
      spinsLeft: Math.max(wheelCode.spinsAllowed - plays.length - 1, 0),
    };
  });

  realtime.wheelChanged();
  const [segments, [result]] = await Promise.all([
    translateSegments(outcome.segments, language),
    translateSegments([outcome.result], language),
  ]);
  return { code: outcome.code, result, segments, spinsLeft: outcome.spinsLeft };
};

const generateCodeValue = () => Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]).join('');

// Délivre un code de jeu : il n'expire pas et donne le nombre de tours réglé dans les paramètres.
const generateCode = async (user) => {
  settingsService.assertOpen('wheelOpen');
  const spinsAllowed = settingsService.wheelSpinsPerCode();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const created = await wheelRepository.createCode({ code: generateCodeValue(), createdByUserId: user.id, spinsAllowed });
      realtime.wheelChanged();
      return { code: created.code, spinsAllowed: created.spinsAllowed };
    } catch (error) {
      if (!(error instanceof UniqueConstraintError)) throw error;
    }
  }
  throw new AppError(503, 'WHEEL_CODE_UNAVAILABLE', 'Impossible de créer un code pour le moment. Réessayez.');
};

const personName = (person) => (person ? { firstName: person.firstName, lastName: person.lastName } : null);

// Tour joué vu par l'équipe : code, joueur, résultat et remise du lot.
const adminPlay = (item) => {
  const values = plain(item);
  return {
    id: values.id,
    code: values.wheelCode?.code || null,
    playedAt: values.playedAt,
    result: { kind: values.resultKind, label: values.resultLabel, sponsor: values.resultSponsor },
    player: values.player ? { displayName: values.player.displayName, email: values.player.email, phone: values.player.phone } : null,
    claimedAt: values.claimedAt || null,
    claimedBy: personName(values.claimedBy),
  };
};

// Code délivré, pour la fenêtre « Code de jeu » : gagnant si un tour a donné un lot, perdant s'il a été joué sans lot.
const adminCode = (item) => {
  const values = plain(item);
  const plays = values.plays || [];
  return {
    id: values.id,
    code: values.code,
    createdAt: values.createdAt,
    spinsAllowed: values.spinsAllowed,
    spinsUsed: plays.length,
    outcome: plays.some((play) => play.resultKind === 'prize') ? 'won' : plays.length ? 'lost' : null,
  };
};

// Rassemble les cases, les codes délivrés, l'historique des tours et les chiffres de la roue pour l'administration.
const overview = async () => {
  const [segments, codes, plays] = await Promise.all([
    wheelRepository.findSegments(),
    wheelRepository.findCodes(),
    wheelRepository.findPlays(),
  ]);
  const list = segments.map(adminSegment);
  return {
    segments: list,
    codes: codes.map(adminCode),
    plays: plays.map(adminPlay),
    stats: {
      played: plays.length,
      awarded: list.reduce((total, segment) => total + (segment.kind === 'prize' ? segment.awarded : 0), 0),
      remaining: list.reduce((total, segment) => total + (segment.kind === 'prize' && segment.isActive ? segment.remaining : 0), 0),
    },
  };
};

const getSegment = async (id) => {
  const segment = await wheelRepository.findSegmentById(id);
  if (!segment) throw new AppError(404, 'WHEEL_SEGMENT_NOT_FOUND', 'Case de la roue introuvable.');
  return segment;
};

// Un lot garde une quantité, une case perdante n'en a pas.
const normalizeSegment = (values) => {
  const next = { ...values };
  if (next.kind === 'lose') {
    next.quantity = null;
    next.sponsor = null;
  } else if (next.kind === 'prize' && (next.quantity === null || next.quantity === undefined)) {
    next.quantity = 0;
  }
  return next;
};

const createSegment = async (values) => {
  const created = await wheelRepository.createSegment(normalizeSegment({ ...values, position: await wheelRepository.nextPosition() }));
  realtime.wheelChanged();
  return adminSegment(created);
};

const updateSegment = async (id, values) => {
  const segment = await getSegment(id);
  const next = normalizeSegment({ kind: segment.kind, quantity: segment.quantity, sponsor: segment.sponsor, ...values });
  if (next.kind === 'prize' && next.quantity !== undefined && next.quantity < segment.awarded) {
    throw new AppError(422, 'WHEEL_QUANTITY_TOO_LOW', `${segment.awarded} lot(s) déjà gagné(s) : la quantité ne peut pas être inférieure.`);
  }
  const updated = await wheelRepository.updateSegment(segment, next);
  realtime.wheelChanged();
  return adminSegment(updated);
};

const removeSegment = async (id) => {
  await wheelRepository.removeSegment(await getSegment(id));
  realtime.wheelChanged();
};

// Sans lot gagné avec ce code : il n'existe pas, n'a pas encore été joué ou n'a rien gagné.
const noPrize = async (code) => {
  const wheelCode = await wheelRepository.findCodeByValue(code);
  if (!wheelCode) return new AppError(404, 'WHEEL_CODE_INVALID', 'Ce code n’existe pas.');
  if (!(await wheelRepository.countPlays(wheelCode.id))) return new AppError(409, 'WHEEL_NOT_PLAYED', 'Ce code n’a pas encore été joué.');
  return new AppError(409, 'WHEEL_NO_PRIZE', 'Ce code n’a pas gagné de lot.');
};

// Lot gagné avec un code : le plus ancien pas encore remis, sinon le dernier remis (pour l'indiquer).
const findPrize = async (rawCode) => {
  const code = normalizeCode(rawCode);
  const prizes = await wheelRepository.findCodePrizes(code);
  if (!prizes.length) throw await noPrize(code);
  return adminPlay(prizes.find((play) => !play.claimedAt) || prizes[prizes.length - 1]);
};

// Marque le lot comme remis, une seule fois : une capture d'écran ne permet pas de le réclamer deux fois.
// Un code qui a gagné plusieurs lots les remet un par un.
const claimPrize = async (user, rawCode) => {
  const code = normalizeCode(rawCode);
  const prize = await wheelRepository.sequelize.transaction(async (transaction) => {
    const prizes = await wheelRepository.findCodePrizes(code, transaction);
    if (!prizes.length) throw await noPrize(code);
    const next = prizes.find((play) => !play.claimedAt);
    if (!next) {
      const error = new AppError(409, 'WHEEL_PRIZE_ALREADY_CLAIMED', 'Ce lot a déjà été remis.');
      error.details = adminPlay(prizes[prizes.length - 1]);
      throw error;
    }
    await wheelRepository.updatePlay(next, { claimedAt: new Date(), claimedByUserId: user.id }, transaction);
    return { ...adminPlay(next), claimedBy: personName(user) };
  });
  realtime.wheelChanged();
  return prize;
};

module.exports = {
  listPublic,
  spin,
  generateCode,
  overview,
  createSegment,
  updateSegment,
  removeSegment,
  arrange,
  isDrawable,
  normalizeCode,
  findPrize,
  claimPrize,
};
