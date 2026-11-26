const { Op } = require('sequelize');
const { B2bMeeting, ChallengePassport, InvestorMeeting, StudioInvitation, Occupant } = require('../../models');
const programEventService = require('../program-event/program-event.service');
const occupantRepository = require('../occupant/occupant.repository');
const settingsService = require('../settings/settings.service');
const { SERVICE_KEYS } = require('../../shared/services');

const DAY = 24 * 60 * 60 * 1000;
const CAPSULES = 4;

// Le service du jour : celui choisi dans Paramètres, sinon les six services à tour de rôle, un par jour de Foire.
const serviceOfDay = (now = new Date()) => {
  const chosen = settingsService.current().screenService;
  if (chosen && SERVICE_KEYS.includes(chosen)) return chosen;
  const first = Date.parse(`${settingsService.studioSchedule().firstDay}T00:00:00Z`);
  const day = Math.max(0, Math.floor((now.getTime() - first) / DAY));
  return SERVICE_KEYS[day % SERVICE_KEYS.length];
};

// Compteurs mesurés par HubInvest, sans aucune donnée personnelle.
const counters = async () => {
  const [players, stepsCompleted, guichetMeetings, b2bMeetings, capsules] = await Promise.all([
    ChallengePassport.count(),
    ChallengePassport.count({ where: { status: { [Op.in]: ['completed', 'redeemed'] } } }),
    InvestorMeeting.count({ where: { status: { [Op.ne]: 'cancelled' } } }),
    B2bMeeting.count({ where: { outcome: 'present' } }),
    StudioInvitation.count({ where: { status: 'delivered' } }),
  ]);
  return { players, stepsCompleted, guichetMeetings, b2bMeetings, capsules };
};

// Dernières capsules livrées : faites pour être partagées, elles s'affichent avec le nom de l'invité.
const latestCapsules = async () => (await StudioInvitation.findAll({
  where: { status: 'delivered', capsuleUrl: { [Op.ne]: null } },
  attributes: ['id', 'guestName', 'organization', 'format', 'capsuleUrl', 'deliveredAt'],
  include: [{ model: Occupant, as: 'occupant', attributes: ['name'], required: false }],
  order: [['deliveredAt', 'DESC']],
  limit: CAPSULES,
})).map((item) => ({
  id: item.id,
  guestName: item.guestName,
  organization: item.organization || item.occupant?.name || null,
  format: settingsService.studioFormatLabel(item.format),
  url: item.capsuleUrl,
}));

// Les stands actifs du Hub (API-ZF d'abord) : nom, numéro et logo.
const stands = async () => (await occupantRepository.findPublic()).map((item) => ({
  id: item.id, name: item.name, standLabel: item.standLabel, logoUrl: item.logoUrl,
}));

// Tout ce que le grand écran du Stand affiche (document v4, M7). En mode vidéo, la boucle de repli passe d'abord ;
// les données en direct l'accompagnent, pour que l'écran y revienne si la vidéo ne peut pas être lue.
const getPublic = async (now = new Date()) => {
  const settings = settingsService.current();
  const [today, numbers, capsules, standList] = await Promise.all([programEventService.getToday('fr', now), counters(), latestCapsules(), stands()]);
  const nextInterview = today.today.find((event) => event.type === 'studio' && new Date(event.endsAt || event.startsAt) > now)
    || today.upcoming.find((event) => event.type === 'studio')
    || null;
  const video = settings.screenMode === 'video' && settings.screenVideoUrl;
  return {
    mode: video ? 'video' : 'live',
    ...(video && { videoUrl: settings.screenVideoUrl }),
    date: today.date,
    service: serviceOfDay(now),
    spotlight: today.spotlight,
    nextInterview,
    counters: numbers,
    capsules,
    stands: standList,
  };
};

module.exports = { getPublic, serviceOfDay };
