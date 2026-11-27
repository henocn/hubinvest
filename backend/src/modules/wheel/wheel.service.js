const crypto = require('node:crypto');
const AppError = require('../../shared/app-error');
const { translatePublicContent } = require('../../shared/translation.service');
const wheelRepository = require('./wheel.repository');
const { events: realtime } = require('../realtime/realtime.service');
const settingsService = require('../settings/settings.service');

// Code du joueur, montré pour recevoir un lot : lettres et chiffres sans ambiguïté à l'oral ou à l'écrit (pas de 0/O, 1/I/L).
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

const publicSegment = (segment) => ({ id: segment.id, kind: segment.kind, label: segment.label });

// Une partie : toutes les cases perdantes actives et 4 lots tirés au hasard parmi ceux qui restent (on peut en régler
// jusqu'à une vingtaine ; seuls 4 apparaissent sur la roue, différents d'une partie à l'autre).
const PRIZES_PER_WHEEL = 4;

const shuffle = (items, randomIndex) => {
  const list = [...items];
  for (let index = list.length - 1; index > 0; index -= 1) {
    const other = randomIndex(index + 1);
    [list[index], list[other]] = [list[other], list[index]];
  }
  return list;
};

const pickWheel = (segments, randomIndex = crypto.randomInt) => {
  const drawable = segments.filter(isDrawable);
  const prizes = shuffle(drawable.filter((segment) => segment.kind === 'prize'), randomIndex).slice(0, PRIZES_PER_WHEEL);
  return arrange([...drawable.filter((segment) => segment.kind === 'lose'), ...prizes]);
};

// La roue affichée au joueur (identifiants dans l'ordre) est reprise pour le tirage si elle est encore valable : toutes
// les cases perdantes actives et au plus 4 lots disponibles. Sinon, une nouvelle roue est tirée.
const wheelFrom = (segments, shownIds, randomIndex) => {
  const drawable = segments.filter(isDrawable);
  const byId = new Map(drawable.map((segment) => [segment.id, segment]));
  const shown = (Array.isArray(shownIds) ? shownIds : []).map((id) => byId.get(id)).filter(Boolean);
  const losing = drawable.filter((segment) => segment.kind === 'lose');
  const shownPrizes = shown.filter((segment) => segment.kind === 'prize');
  const expectedPrizes = Math.min(PRIZES_PER_WHEEL, drawable.length - losing.length);
  const valid = new Set(shown.map((segment) => segment.id)).size === shown.length
    && losing.every((segment) => shown.includes(segment))
    && shownPrizes.length === expectedPrizes;
  return valid ? shown : pickWheel(segments, randomIndex);
};

const adminSegment = (segment) => {
  const values = plain(segment);
  return { ...values, remaining: remainingOf(values), drawable: isDrawable(values) };
};

const translateSegments = (segments, language) => translatePublicContent(segments, ['label'], language);

// Renvoie les cases visibles sur la roue publique.
const listPublic = async (language) => {
  const segments = pickWheel((await wheelRepository.findActiveSegments()).map(plain));
  return { segments: await translateSegments(segments.map(publicSegment), language) };
};

const normalizeCode = (value) => String(value || '').trim().toUpperCase().replace(/[\s-]/g, '');

const generateCodeValue = () => Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]).join('');

// Joueur identifié et tours qu'il lui reste. Le nombre de tours (réglage « tours par joueur ») vaut pour la personne :
// les tours joués sous un autre compte avec le même e-mail ou le même téléphone comptent aussi.
const playerTurns = async (player, transaction) => {
  const passport = await wheelRepository.findPlayerForUpdate(player, transaction);
  if (!passport) throw new AppError(422, 'WHEEL_PLAYER_REQUIRED', 'Identifiez-vous avant de jouer.');
  const allowed = settingsService.wheelSpinsPerPlayer();
  const used = await wheelRepository.countPlayerPlays(passport, transaction);
  return { passport, allowed, spinsLeft: Math.max(allowed - used, 0) };
};

// Code du joueur, montré quand il gagne pour recevoir son lot : créé à son premier tour, puis repris à chaque tour.
const playerCode = async (passport, allowed, transaction) => {
  const existing = await wheelRepository.findPlayerCode(passport.id, transaction);
  if (existing) return existing;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateCodeValue();
    if (!(await wheelRepository.findCodeByValue(code, transaction))) {
      return wheelRepository.createCode({ code, createdByUserId: null, spinsAllowed: allowed }, transaction);
    }
  }
  throw new AppError(503, 'WHEEL_CODE_UNAVAILABLE', 'La roue est momentanément indisponible. Réessayez.');
};

// Tours restants du joueur, avant d'afficher la roue : rien n'est joué ni enregistré.
const status = async ({ player }) => {
  settingsService.assertOpen('wheelOpen');
  const { allowed, spinsLeft } = await wheelRepository.sequelize.transaction((transaction) => playerTurns(player, transaction));
  return { spinsAllowed: allowed, spinsLeft };
};

// Tire une case au hasard parmi celles visibles : le tour est enregistré et le stock décompté dans la même transaction.
// Pas de code à saisir : le joueur identifié joue directement, autant de tours que le réglage le permet.
const spin = async ({ player, wheel }, language, randomIndex = crypto.randomInt) => {
  settingsService.assertOpen('wheelOpen');
  const outcome = await wheelRepository.sequelize.transaction(async (transaction) => {
    const { passport, allowed, spinsLeft } = await playerTurns(player, transaction);
    if (spinsLeft <= 0) throw new AppError(409, 'WHEEL_NO_SPINS_LEFT', 'Vous avez joué tous vos tours.');

    const segments = wheelFrom(await wheelRepository.findActiveSegmentsForUpdate(transaction), wheel, randomIndex);
    if (!segments.length) throw new AppError(409, 'WHEEL_EMPTY', 'La roue n’est pas encore prête. Revenez dans un instant.');

    const wheelCode = await playerCode(passport, allowed, transaction);
    const chosen = segments[randomIndex(segments.length)];
    if (chosen.kind === 'prize') await wheelRepository.recordAward(chosen, transaction);
    await wheelRepository.createPlay({
      wheelCodeId: wheelCode.id,
      passportId: passport.id,
      segmentId: chosen.id,
      resultKind: chosen.kind,
      resultLabel: chosen.label,
      playedAt: new Date(),
    }, transaction);

    return {
      code: wheelCode.code,
      result: publicSegment(chosen),
      segments: segments.map(publicSegment),
      spinsLeft: spinsLeft - 1,
    };
  });

  realtime.wheelChanged();
  const [segments, [result]] = await Promise.all([
    translateSegments(outcome.segments, language),
    translateSegments([outcome.result], language),
  ]);
  return { code: outcome.code, result, segments, spinsLeft: outcome.spinsLeft };
};

const personName = (person) => (person ? { firstName: person.firstName, lastName: person.lastName } : null);

// Tour joué vu par l'équipe : code, joueur, résultat et remise du lot.
const adminPlay = (item) => {
  const values = plain(item);
  return {
    id: values.id,
    code: values.wheelCode?.code || null,
    playedAt: values.playedAt,
    result: { kind: values.resultKind, label: values.resultLabel },
    player: values.player ? { displayName: values.player.displayName, email: values.player.email, phone: values.player.phone } : null,
    claimedAt: values.claimedAt || null,
    claimedBy: personName(values.claimedBy),
  };
};

// Code d'un joueur, avec ses tours : gagnant si un tour a donné un lot, perdant s'il a été joué sans lot.
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
  const next = normalizeSegment({ kind: segment.kind, quantity: segment.quantity, ...values });
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

const markClaimed = async (user, play, transaction) => {
  await wheelRepository.updatePlay(play, { claimedAt: new Date(), claimedByUserId: user.id }, transaction);
  return { ...adminPlay(play), claimedBy: personName(user) };
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
    return markClaimed(user, next, transaction);
  });
  realtime.wheelChanged();
  return prize;
};

// Remise depuis l'historique du back office : ce tour précis, s'il a gagné un lot pas encore remis.
const claimPlay = async (user, id) => {
  const prize = await wheelRepository.sequelize.transaction(async (transaction) => {
    const play = await wheelRepository.findPlayForClaim(id, transaction);
    if (!play) throw new AppError(404, 'WHEEL_PLAY_NOT_FOUND', 'Partie introuvable.');
    if (play.resultKind !== 'prize') throw new AppError(409, 'WHEEL_NO_PRIZE', 'Cette partie n’a pas gagné de lot.');
    if (play.claimedAt) {
      const error = new AppError(409, 'WHEEL_PRIZE_ALREADY_CLAIMED', 'Ce lot a déjà été remis.');
      error.details = adminPlay(play);
      throw error;
    }
    return markClaimed(user, play, transaction);
  });
  realtime.wheelChanged();
  return prize;
};

// Supprime une partie (essai, erreur de saisie…). Un lot gagné et pas encore remis retourne au stock ;
// un lot déjà remis reste décompté, puisqu'il est parti. Le tour est rendu au joueur.
const removePlay = async (id) => {
  await wheelRepository.sequelize.transaction(async (transaction) => {
    const play = await wheelRepository.findPlayForClaim(id, transaction);
    if (!play) throw new AppError(404, 'WHEEL_PLAY_NOT_FOUND', 'Partie introuvable.');
    if (play.resultKind === 'prize' && !play.claimedAt && play.segmentId) await wheelRepository.releaseAward(play.segmentId, transaction);
    await wheelRepository.removePlay(play, transaction);
  });
  realtime.wheelChanged();
};

module.exports = {
  listPublic,
  status,
  spin,
  overview,
  createSegment,
  updateSegment,
  removeSegment,
  arrange,
  isDrawable,
  normalizeCode,
  findPrize,
  claimPrize,
  claimPlay,
  removePlay,
};
