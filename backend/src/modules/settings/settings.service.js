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
const publicSettings = () => current();

module.exports = { MODULES, load, current, requiredPassages, wheelPlaysPerDay, assertOpen, update, publicSettings, _reset: () => { cache = defaults(); } };
