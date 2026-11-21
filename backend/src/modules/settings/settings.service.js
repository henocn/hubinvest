const env = require('../../config/env');
const AppError = require('../../shared/app-error');
const { AppSetting } = require('../../models');
const { events: realtime } = require('../realtime/realtime.service');

// Modules du site public qu'on peut ouvrir ou fermer depuis l'administration, avec le message affiché une fois fermé.
const MODULES = Object.freeze({
  contactRequestsOpen: 'Les demandes de contact aux stands sont closes.',
  investorDeskOpen: 'L’Investor Desk ne reçoit plus de nouvelles demandes.',
  b2bOpen: 'Les propositions de rencontre B2B sont closes.',
  challengeOpen: 'Les Défis sont terminés.',
  wheelOpen: 'La roue des opportunités est fermée.',
  liveQuestionsOpen: 'Les questions en direct sont fermées.',
});

const defaults = () => ({
  ...Object.fromEntries(Object.keys(MODULES).map((key) => [key, true])),
  requiredPassages: Math.max(1, env.challenge.requiredPassages),
  // Parties de roue par joueur et par jour ; 0 = sans limite.
  wheelPlaysPerDay: 1,
  // Tours de roue donnés par un code de jeu (un code n'expire pas).
  wheelSpinsPerCode: 1,
  // Rencontre B2B : tables, durée d'un rendez-vous et horaires (heure de Lomé). Le document fixe 20 minutes ; le reste est à confirmer.
  b2bTables: 4,
  b2bMeetingMinutes: 20,
  b2bDayStart: '09:00',
  b2bDayEnd: '17:00',
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

const current = () => ({ ...cache });

const requiredPassages = () => Math.max(1, Number(cache.requiredPassages) || 1);

const wheelPlaysPerDay = () => Math.max(0, Number(cache.wheelPlaysPerDay) || 0);

const wheelSpinsPerCode = () => Math.max(1, Number(cache.wheelSpinsPerCode) || 1);

const b2bSchedule = () => ({
  tables: Math.max(1, Number(cache.b2bTables) || 1),
  minutes: Math.max(5, Number(cache.b2bMeetingMinutes) || 20),
  dayStart: cache.b2bDayStart || '09:00',
  dayEnd: cache.b2bDayEnd || '17:00',
});

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

module.exports = { MODULES, load, current, requiredPassages, wheelPlaysPerDay, wheelSpinsPerCode, b2bSchedule, investorFollowUpDelay, investorQualificationFields, assertOpen, update, publicSettings, _reset: () => { cache = defaults(); } };
