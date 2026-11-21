// Titres d'onglet lors d'une navigation sans rechargement. Ils reprennent ceux que le serveur
// place dans la page à l'ouverture directe d'une adresse (backend/src/modules/seo).
export const SITE_NAME = 'Hub de l’Investissement';

const titles = {
  '/': `${SITE_NAME} · Investir au Togo avec l’API-ZF`,
  '/stands': `Stands et exposants · ${SITE_NAME}`,
  '/guichets': `Les guichets du Stand API-ZF · ${SITE_NAME}`,
  '/guichets/rappel': `Les guichets du Stand API-ZF · ${SITE_NAME}`,
  '/investor-desk': `Les guichets du Stand API-ZF · ${SITE_NAME}`,
  '/rencontres': `Rencontres professionnelles · ${SITE_NAME}`,
  '/b2b': `Besoins B2B des exposants · ${SITE_NAME}`,
  '/defis': `Défis et roue des opportunités · ${SITE_NAME}`,
  '/roue': `Défis et roue des opportunités · ${SITE_NAME}`,
};

export const titleForPath = (path) => titles[path] || SITE_NAME;

export const setPageTitle = (title) => {
  document.title = title;
};
