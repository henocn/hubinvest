// Les trois guichets du Stand API-ZF (document v4, § 04), signalés par leur question.
const GUICHETS = Object.freeze({
  project: { fr: 'Mon projet d’investissement', en: 'My investment project' },
  regime: { fr: 'Quel régime pour mon investissement ?', en: 'Which regime for my investment?' },
  company: { fr: 'Mon entreprise, mes difficultés', en: 'My company, my difficulties' },
});
const GUICHET_KEYS = Object.keys(GUICHETS);

// D'où vient le contact : rendez-vous réservé en ligne, demande de rappel, passage au guichet (saisi par l'équipe).
const CONTACT_SOURCES = ['online_booking', 'callback', 'desk'];

// A projet prioritaire, B potentiel à suivre, C contact à nourrir, support = Accompagnement (entreprise installée en difficulté).
const CLASSIFICATIONS = ['A', 'B', 'C', 'support'];

const guichetLabel = (key, language = 'fr') => GUICHETS[key]?.[language === 'en' ? 'en' : 'fr'] || GUICHETS.project.fr;
// Le lieu d'un rendez-vous au guichet, tel qu'il figure dans l'e-mail.
const guichetLocation = (key, language = 'fr') => (language === 'en'
  ? `API-ZF Stand · “${guichetLabel(key, 'en')}” desk`
  : `Stand API-ZF · guichet « ${guichetLabel(key, 'fr')} »`);

module.exports = { GUICHETS, GUICHET_KEYS, CONTACT_SOURCES, CLASSIFICATIONS, guichetLabel, guichetLocation };
