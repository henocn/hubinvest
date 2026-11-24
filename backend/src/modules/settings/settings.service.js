const env = require('../../config/env');
const AppError = require('../../shared/app-error');
const { Op } = require('sequelize');
const { CHALLENGE_STEPS } = require('../../shared/challenge-steps');
const { AppSetting, StudioInvitation } = require('../../models');
const { events: realtime } = require('../realtime/realtime.service');

// Modules du site public qu'on peut ouvrir ou fermer depuis l'administration, avec le message affiché une fois fermé.
const MODULES = Object.freeze({
  contactRequestsOpen: 'Les demandes de contact aux stands sont closes.',
  investorDeskOpen: 'Les guichets ne prennent plus de rendez-vous ni de demandes de rappel en ligne.',
  b2bOpen: 'Les propositions de rencontre B2B sont closes.',
  challengeOpen: 'Les Défis sont terminés.',
  wheelOpen: 'La roue des opportunités est fermée.',
  liveQuestionsOpen: 'Les questions en direct sont fermées.',
});

const defaults = () => ({
  ...Object.fromEntries(Object.keys(MODULES).map((key) => [key, true])),
  // Grand écran du Stand : en direct (live) ou boucle vidéo de repli (video) ; service du jour choisi ('' = à tour de rôle).
  screenMode: 'live',
  screenService: '',
  screenVideoUrl: '',
  // Récompenses du parcours en stock (document v4 : « récompenses à stock suivi ») ; 0 = stock non suivi.
  challengeRewardStock: 0,
  // Tours de roue donnés par un code de jeu (un code n'expire pas).
  wheelSpinsPerCode: 1,
  // Rencontre B2B : tables, durée d'un rendez-vous et horaires (heure de Lomé). Le document fixe 20 minutes ; le reste est à confirmer.
  b2bTables: 4,
  b2bMeetingMinutes: 20,
  b2bDayStart: '09:00',
  b2bDayEnd: '17:00',
  // Studio : créneaux réservables par les invités (le document place le Studio l'après-midi, pendant les 17 jours de la Foire).
  studioFirstDay: '2026-11-27',
  studioLastDay: '2026-12-13',
  studioDayStart: '14:00',
  studioDayEnd: '18:00',
  studioSlotMinutes: 20,
  // Guichets du Stand API-ZF : créneaux de rendez-vous réservables en ligne (diagnostic en 15 minutes).
  guichetFirstDay: '2026-11-27',
  guichetLastDay: '2026-12-13',
  guichetDayStart: '09:00',
  guichetDayEnd: '18:00',
  guichetSlotMinutes: 15,
  // Formats de tournage proposés aux invités (ceux du document) ; la clé reste fixe pour les invitations déjà faites.
  studioFormats: [
    { key: 'two_minutes', label: '2 min avec…', labelEn: '2 min with…' },
    { key: 'sixty_seconds', label: 'API-ZF en 60 secondes', labelEn: 'API-ZF in 60 seconds' },
    { key: 'face_to_face', label: 'Face-à-face', labelEn: 'Face-to-face interview' },
  ],
  // Investor Desk : délais de relance du document (A sous 48 h, B sous 7 jours).
  investorDelayAHours: 48,
  investorDelayBDays: 7,
  // Les neuf informations de qualification : le document ne les nomme pas, cette liste de travail se corrige dans Paramètres.
  investorQualificationFields: [
    { key: 'sector', label: 'Secteur d’activité', type: 'select', options: ['Agro-industrie', 'Industrie', 'Services', 'Logistique', 'Énergie', 'Numérique', 'Autre'] },
    { key: 'projectType', label: 'Nature du projet', type: 'select', options: ['Création', 'Extension', 'Implantation', 'Partenariat'] },
    { key: 'origin', label: 'Pays ou origine de l’investisseur', type: 'text' },
    { key: 'amount', label: 'Montant envisagé', type: 'select', options: ['Moins de 100 millions FCFA', '100 à 500 millions FCFA', '500 millions à 2 milliards FCFA', 'Plus de 2 milliards FCFA'] },
    { key: 'jobs', label: 'Emplois envisagés', type: 'number' },
    { key: 'stage', label: 'Stade du projet', type: 'select', options: ['Idée', 'Étude', 'Financement trouvé', 'Prêt à démarrer'] },
    { key: 'horizon', label: 'Horizon de décision', type: 'select', options: ['Moins de 6 mois', '6 à 12 mois', 'Plus de 12 mois'] },
    { key: 'need', label: 'Besoin principal auprès de l’API-ZF', type: 'select', options: ['Agrément', 'Foncier', 'Partenaire', 'Information'] },
    { key: 'agreement', label: 'Agrément déjà engagé auprès de l’API-ZF', type: 'yesno' },
  ],
});

// Les réglages sont gardés en mémoire : lus à chaque requête sans interroger la base, rechargés à chaque modification.
let cache = defaults();

const load = async () => {
  const rows = await AppSetting.findAll();
  cache = { ...defaults(), ...Object.fromEntries(rows.map((row) => [row.key, row.value])) };
  return cache;
};

// Le nombre d'étapes du parcours est fixe ; une ancienne valeur enregistrée est ignorée.
const current = () => ({ ...cache, requiredPassages: CHALLENGE_STEPS });

// Le parcours « Trouvez les 5 étapes » compte toujours cinq étapes.
const requiredPassages = () => CHALLENGE_STEPS;
const challengeRewardStock = () => Math.max(0, Number(cache.challengeRewardStock) || 0);

const wheelSpinsPerCode = () => Math.max(1, Number(cache.wheelSpinsPerCode) || 1);

const b2bSchedule = () => ({
  tables: Math.max(1, Number(cache.b2bTables) || 1),
  minutes: Math.max(5, Number(cache.b2bMeetingMinutes) || 20),
  dayStart: cache.b2bDayStart || '09:00',
  dayEnd: cache.b2bDayEnd || '17:00',
});

const studioSchedule = () => ({
  firstDay: cache.studioFirstDay || '2026-11-27',
  lastDay: cache.studioLastDay || '2026-12-13',
  dayStart: cache.studioDayStart || '14:00',
  dayEnd: cache.studioDayEnd || '18:00',
  minutes: Math.max(5, Number(cache.studioSlotMinutes) || 20),
});

const guichetSchedule = () => ({
  firstDay: cache.guichetFirstDay || '2026-11-27',
  lastDay: cache.guichetLastDay || '2026-12-13',
  dayStart: cache.guichetDayStart || '09:00',
  dayEnd: cache.guichetDayEnd || '18:00',
  minutes: Math.max(5, Number(cache.guichetSlotMinutes) || 15),
});

const studioFormats = () => (Array.isArray(cache.studioFormats) ? cache.studioFormats : []);

// Libellé d'un format dans la langue de l'invité (le français à défaut de traduction).
const studioFormatLabel = (key, language = 'fr') => {
  const format = studioFormats().find((item) => item.key === key);
  if (!format) return null;
  return (language === 'en' && format.labelEn) || format.label;
};

// Délai avant la relance d'une classe (en millisecondes) ; C n'a pas de relance individuelle (newsletter).
const investorFollowUpDelay = (classification) => {
  if (classification === 'A') return Math.max(1, Number(cache.investorDelayAHours) || 48) * 60 * 60 * 1000;
  if (classification === 'B') return Math.max(1, Number(cache.investorDelayBDays) || 7) * 24 * 60 * 60 * 1000;
  return null;
};

const investorQualificationFields = () => (Array.isArray(cache.investorQualificationFields) ? cache.investorQualificationFields : []);

// Refuse l'action publique quand son module est fermé.
const assertOpen = (key) => {
  if (cache[key] === false) throw new AppError(403, 'MODULE_CLOSED', MODULES[key]);
};

const update = async (values, user) => {
  const known = Object.entries(values).filter(([key]) => key in defaults());
  // Un format encore utilisé par une invitation ne se retire pas : on le renomme.
  if (Array.isArray(values.studioFormats)) {
    const used = await StudioInvitation.count({ where: { format: { [Op.notIn]: values.studioFormats.map((item) => item.key) } } });
    if (used) throw new AppError(409, 'STUDIO_FORMAT_IN_USE', 'Un format retiré est encore utilisé par des invitations : renommez-le plutôt.');
  }
  await AppSetting.sequelize.transaction(async (transaction) => {
    for (const [key, value] of known) {
      await AppSetting.upsert({ key, value, updatedByUserId: user.id }, { transaction });
    }
  });
  await load();
  realtime.settingsChanged();
  return current();
};

// Ce que le site public a besoin de savoir : modules ouverts et nombre de stands des Défis.
const publicSettings = () => {
  const { investorQualificationFields: _fields, ...rest } = current();
  return rest;
};

module.exports = { MODULES, load, current, requiredPassages, challengeRewardStock, wheelSpinsPerCode, b2bSchedule, studioSchedule, guichetSchedule, studioFormats, studioFormatLabel, investorFollowUpDelay, investorQualificationFields, assertOpen, update, publicSettings, _reset: () => { cache = defaults(); } };
