const crypto = require('node:crypto');
const { UniqueConstraintError } = require('sequelize');
const env = require('../../config/env');
const AppError = require('../../shared/app-error');
const { translatePublicContent } = require('../../shared/translation.service');
const wheelRepository = require('./wheel.repository');
const { events: realtime } = require('../realtime/realtime.service');

// Lettres et chiffres sans ambiguïté à l'oral ou à l'écrit (pas de 0/O, 1/I/L).
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 4;
const RECENT_CODES = 30;

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

// Tire une case au hasard parmi celles visibles : le code est consommé et le stock décompté dans la même transaction.
// Seul un joueur identifié peut jouer ; sa partie lui est rattachée.
const spin = async ({ code: rawCode, player }, language, randomIndex = crypto.randomInt) => {
  const code = normalizeCode(rawCode);
  const outcome = await wheelRepository.sequelize.transaction(async (transaction) => {
    const passport = await wheelRepository.findPlayerByToken(player, transaction);
    if (!passport) throw new AppError(422, 'WHEEL_PLAYER_REQUIRED', 'Identifiez-vous avant de jouer.');
    const wheelCode = await wheelRepository.findCodeForUpdate(code, transaction);
    if (!wheelCode) throw new AppError(404, 'WHEEL_CODE_INVALID', 'Ce code n’existe pas. Vérifiez-le auprès de l’équipe du stand.');
    if (wheelCode.usedAt) throw new AppError(409, 'WHEEL_CODE_USED', 'Ce code a déjà servi. Demandez-en un nouveau à l’équipe du stand.');
    if (new Date(wheelCode.expiresAt) <= new Date()) throw new AppError(410, 'WHEEL_CODE_EXPIRED', 'Ce code a expiré. Demandez-en un nouveau à l’équipe du stand.');

    const segments = arrange((await wheelRepository.findActiveSegmentsForUpdate(transaction)).filter(isDrawable));
    if (!segments.length) throw new AppError(409, 'WHEEL_EMPTY', 'La roue n’est pas encore prête. Revenez dans un instant.');

    const chosen = segments[randomIndex(segments.length)];
    if (chosen.kind === 'prize') await wheelRepository.recordAward(chosen, transaction);
    await wheelRepository.updateCode(wheelCode, {
      usedAt: new Date(),
      passportId: passport.id,
      segmentId: chosen.id,
      resultKind: chosen.kind,
      resultLabel: chosen.label,
      resultSponsor: chosen.sponsor || null,
    }, transaction);

    return { code, result: publicSegment(chosen), segments: segments.map(publicSegment) };
  });

  realtime.wheelChanged();
  const [segments, [result]] = await Promise.all([
    translateSegments(outcome.segments, language),
    translateSegments([outcome.result], language),
  ]);
  return { code: outcome.code, result, segments };
};

const generateCodeValue = () => Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]).join('');

// Délivre un code à usage unique, valable pendant la durée configurée.
const generateCode = async (user) => {
  const expiresAt = new Date(Date.now() + env.wheel.codeTtl);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const created = await wheelRepository.createCode({ code: generateCodeValue(), createdByUserId: user.id, expiresAt });
      realtime.wheelChanged();
      return { code: created.code, expiresAt: created.expiresAt };
    } catch (error) {
      if (!(error instanceof UniqueConstraintError)) throw error;
    }
  }
  throw new AppError(503, 'WHEEL_CODE_UNAVAILABLE', 'Impossible de créer un code pour le moment. Réessayez.');
};

// Rassemble les cases, les derniers codes et les chiffres de la roue pour l'administration.
const overview = async () => {
  const [segments, codes, played] = await Promise.all([
    wheelRepository.findSegments(),
    wheelRepository.findRecentCodes(RECENT_CODES),
    wheelRepository.countPlayed(),
  ]);
  const list = segments.map(adminSegment);
  return {
    segments: list,
    codes: codes.map((item) => {
      const values = plain(item);
      const expired = !values.usedAt && new Date(values.expiresAt) <= new Date();
      return {
        id: values.id,
        code: values.code,
        createdAt: values.createdAt,
        expiresAt: values.expiresAt,
        usedAt: values.usedAt,
        status: values.usedAt ? 'used' : expired ? 'expired' : 'waiting',
        result: values.usedAt ? { kind: values.resultKind, label: values.resultLabel, sponsor: values.resultSponsor } : null,
        createdBy: values.createdBy ? { firstName: values.createdBy.firstName, lastName: values.createdBy.lastName } : null,
        player: values.player ? { displayName: values.player.displayName, email: values.player.email, phone: values.player.phone } : null,
      };
    }),
    stats: {
      played,
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
};
