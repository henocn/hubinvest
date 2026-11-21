const crypto = require('node:crypto');
const { UniqueConstraintError } = require('sequelize');
const AppError = require('../../shared/app-error');
const roles = require('../../shared/roles');
const { translatePublicContent } = require('../../shared/translation.service');
const studioInvitationRepository = require('./studio-invitation.repository');
const notificationService = require('../notification/notification.service');
const { events: realtime } = require('../realtime/realtime.service');
const settingsService = require('../settings/settings.service');

// Studio (document, module M5) : invitation personnelle, créneau réservé par l'invité, rappels automatiques,
// livraison de la capsule. Heures de Lomé = UTC.
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
// L'invité peut changer de créneau jusqu'à une heure avant.
const CHANGE_LIMIT = 60 * MINUTE;

const plain = (value) => (value?.toJSON ? value.toJSON() : value);

const standFor = (user) => {
  if (user.role === roles.SUPER_ADMIN) return null;
  if (!user.occupantId) throw new AppError(403, 'STAND_REQUIRED', 'Cet administrateur n’est rattaché à aucun stand.');
  return user.occupantId;
};

const toMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Tous les créneaux du Studio, jour par jour, selon les réglages.
const allSlots = () => {
  const { firstDay, lastDay, dayStart, dayEnd, minutes } = settingsService.studioSchedule();
  const slots = [];
  for (let day = Date.parse(`${firstDay}T00:00:00Z`); day <= Date.parse(`${lastDay}T00:00:00Z`); day += DAY) {
    const last = day + toMinutes(dayEnd) * MINUTE;
    for (let start = day + toMinutes(dayStart) * MINUTE; start + minutes * MINUTE <= last; start += minutes * MINUTE) slots.push(start);
  }
  return slots;
};

// Créneaux à venir encore libres (le créneau actuel de l'invité compte comme libre pour lui).
const freeSlots = async (ownId = null) => {
  const now = Date.now();
  const slots = allSlots().filter((start) => start > now);
  if (!slots.length) return [];
  const booked = await studioInvitationRepository.findBookedBetween(new Date(slots[0]), new Date(slots.at(-1) + 1));
  const taken = new Set(booked.filter((item) => item.id !== ownId).map((item) => new Date(item.scheduledAt).getTime()));
  return slots.filter((start) => !taken.has(start)).map((start) => new Date(start).toISOString());
};

// Ce que l'invité voit sur sa page : jamais le lien interne ni l'auteur de l'invitation.
const publicPayload = (invitation, language) => {
  const values = plain(invitation);
  return {
    guestName: values.guestName,
    organization: values.organization || values.occupant?.name || null,
    format: values.format,
    formatLabel: settingsService.studioFormatLabel(values.format, language),
    subject: values.subject || null,
    status: values.status,
    scheduledAt: values.scheduledAt,
    durationMinutes: settingsService.studioSchedule().minutes,
    capsuleUrl: values.status === 'delivered' ? values.capsuleUrl : null,
  };
};

const getByToken = async (token) => {
  const invitation = await studioInvitationRepository.findByToken(token);
  if (!invitation) throw new AppError(404, 'STUDIO_INVITATION_NOT_FOUND', 'Invitation introuvable.');
  return invitation;
};

const getPublic = async (token, language) => translatePublicContent(publicPayload(await getByToken(token), language), ['subject'], language);

const publicSlots = async (token) => {
  const invitation = await getByToken(token);
  return { minutes: settingsService.studioSchedule().minutes, slots: await freeSlots(invitation.id) };
};

const assertOpenForGuest = (invitation) => {
  if (!['invited', 'booked'].includes(invitation.status)) throw new AppError(409, 'STUDIO_INVITATION_CLOSED', 'Cette invitation n’est plus ouverte.');
  if (invitation.status === 'booked' && new Date(invitation.scheduledAt).getTime() - Date.now() < CHANGE_LIMIT) {
    throw new AppError(409, 'STUDIO_TOO_LATE', 'Votre passage est dans moins d’une heure : contactez l’équipe du Studio.');
  }
};

// L'invité réserve (ou change) son créneau parmi ceux encore libres ; la base refuse une double réservation.
const book = async (token, startsAt, language) => {
  const invitation = await getByToken(token);
  assertOpenForGuest(invitation);
  const start = new Date(startsAt).getTime();
  if (!allSlots().includes(start) || start <= Date.now()) throw new AppError(422, 'STUDIO_SLOT_INVALID', 'Ce créneau n’est pas proposé.');
  const previousStatus = invitation.status;
  try {
    await studioInvitationRepository.update(invitation, { scheduledAt: new Date(start), status: 'booked', bookedAt: new Date(), respondedAt: new Date() });
  } catch (error) {
    if (error instanceof UniqueConstraintError) throw new AppError(409, 'STUDIO_SLOT_TAKEN', 'Ce créneau vient d’être réservé. Choisissez-en un autre.');
    throw error;
  }
  notificationService.studioBooked(invitation, previousStatus === 'booked');
  realtime.studioChanged(invitation.occupantId);
  return translatePublicContent(publicPayload(invitation, language), ['subject'], language);
};

// L'invité ne peut pas venir : l'équipe est prévenue, les rappels sont annulés.
const decline = async (token, language) => {
  const invitation = await getByToken(token);
  assertOpenForGuest(invitation);
  await studioInvitationRepository.update(invitation, { status: 'declined', scheduledAt: null, respondedAt: new Date() });
  notificationService.studioDeclined(invitation);
  realtime.studioChanged(invitation.occupantId);
  return translatePublicContent(publicPayload(invitation, language), ['subject'], language);
};

const list = (user) => studioInvitationRepository.findAll(standFor(user));

const get = async (user, id) => {
  const invitation = await studioInvitationRepository.findById(id, standFor(user));
  if (!invitation) throw new AppError(404, 'STUDIO_INVITATION_NOT_FOUND', 'Invitation introuvable.');
  return invitation;
};

// Le format doit être l'un de ceux réglés dans Paramètres.
const assertFormat = (format) => {
  if (format && !settingsService.studioFormatLabel(format)) throw new AppError(422, 'STUDIO_FORMAT_UNKNOWN', 'Ce format de tournage n’existe pas.');
};

const formats = () => settingsService.studioFormats();

const assertOccupant = async (occupantId) => {
  if (occupantId && !(await studioInvitationRepository.findOccupantById(occupantId))) throw new AppError(422, 'OCCUPANT_NOT_FOUND', 'Stand introuvable.');
};

// Invitation personnelle : l'invité reçoit par e-mail son lien pour choisir un créneau.
const create = async (user, values) => {
  const occupantId = standFor(user) || values.occupantId || null;
  await assertOccupant(occupantId);
  assertFormat(values.format);
  const invitation = await studioInvitationRepository.create({
    occupantId,
    createdByUserId: user.id,
    token: crypto.randomBytes(32).toString('hex'),
    guestName: values.guestName,
    email: values.email.toLowerCase(),
    phone: values.phone || null,
    organization: values.organization || null,
    format: values.format,
    subject: values.subject || null,
    language: values.language || 'fr',
    scheduledAt: null,
    status: 'invited',
    respondedAt: null,
  });
  notificationService.studioInvited(invitation);
  realtime.studioChanged(occupantId);
  return invitation;
};

// Corrige l'invité (coordonnées, format, sujet) ; le créneau reste choisi par l'invité.
const update = async (user, id, values) => {
  const invitation = await get(user, id);
  const previousOccupantId = invitation.occupantId;
  const next = { ...values };
  if (user.role === roles.ADMIN) delete next.occupantId;
  if ('occupantId' in next) await assertOccupant(next.occupantId);
  if (next.format && next.format !== invitation.format) assertFormat(next.format);
  if (next.email) next.email = next.email.toLowerCase();
  ['phone', 'organization', 'subject'].forEach((key) => { if (next[key] === '') next[key] = null; });
  const updated = await studioInvitationRepository.update(invitation, next);
  realtime.studioChanged([previousOccupantId, updated.occupantId]);
  return updated;
};

const resend = async (user, id) => {
  const invitation = await get(user, id);
  if (!['invited', 'booked'].includes(invitation.status)) throw new AppError(409, 'STUDIO_INVITATION_CLOSED', 'Cette invitation n’est plus ouverte.');
  notificationService.studioInvited(invitation);
  return invitation;
};

// Annule le passage : l'invité est prévenu si son créneau était à venir.
const cancel = async (user, id) => {
  const invitation = await get(user, id);
  if (!['invited', 'booked'].includes(invitation.status)) throw new AppError(409, 'STUDIO_INVITATION_CLOSED', 'Cette invitation n’est plus ouverte.');
  const wasUpcoming = invitation.status === 'booked' && new Date(invitation.scheduledAt).getTime() > Date.now();
  await studioInvitationRepository.update(invitation, { status: 'cancelled' });
  notificationService.studioCancelled(invitation, wasUpcoming);
  realtime.studioChanged(invitation.occupantId);
  return invitation;
};

// Livraison de la capsule : l'invité reçoit le lien de sa vidéo, prête à partager.
const deliver = async (user, id, { capsuleUrl }) => {
  const invitation = await get(user, id);
  if (invitation.status !== 'booked' && invitation.status !== 'delivered') {
    throw new AppError(409, 'STUDIO_NOT_RECORDED', 'La capsule se livre après le passage au Studio.');
  }
  await studioInvitationRepository.update(invitation, { status: 'delivered', capsuleUrl, deliveredAt: new Date() });
  notificationService.studioCapsuleDelivered(invitation);
  realtime.studioChanged(invitation.occupantId);
  return invitation;
};

const remove = async (user, id) => {
  const invitation = await get(user, id);
  await studioInvitationRepository.destroy(invitation);
  notificationService.studioCancelled(invitation, false);
  realtime.studioChanged(invitation.occupantId);
};

module.exports = { getPublic, publicSlots, book, decline, list, formats, create, update, resend, cancel, deliver, remove, allSlots, freeSlots };
