// Titres d'onglet lors d'une navigation sans rechargement. Ils reprennent ceux que le serveur
// place dans la page à l'ouverture directe d'une adresse (backend/src/modules/seo).
export const SITE_NAME = 'Hub de l’Investissement';

const titles = {
  '/': 'Investir au Togo avec l’API-ZF · Hub de l’Investissement, FIL 2026',
  '/stands': `Entreprises de l’Espace Industrie · ${SITE_NAME}`,
  '/guichets': `Rendez-vous aux guichets de l’API-ZF · Investir au Togo · ${SITE_NAME}`,
  '/guichets/rappel': `Être recontacté par l’API-ZF · ${SITE_NAME}`,
  '/investor-desk': `Être recontacté par l’API-ZF · ${SITE_NAME}`,
  '/ecran': `Grand écran · ${SITE_NAME}`,
  '/rencontres': `Rencontrer l’API-ZF et les entreprises · ${SITE_NAME}`,
  '/b2b': `Opportunités d’investissement et besoins B2B · ${SITE_NAME}`,
  '/defis': `Trouvez les 5 étapes et la roue des opportunités · ${SITE_NAME}`,
  '/roue': `Trouvez les 5 étapes et la roue des opportunités · ${SITE_NAME}`,
};

export const titleForPath = (path) => titles[path] || SITE_NAME;

export const setPageTitle = (title) => {
  document.title = title;
};
