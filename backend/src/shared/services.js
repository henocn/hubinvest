// Les six services de l'API-ZF et les douze démarches en ligne (document v4, § 02), écrits dans le code : une mise à
// jour se fait ici ET dans frontend/src/content/services.js (affichage du site). Ici : les clés et titres (guichets,
// grand écran, e-mails) et le texte français repris dans la page servie aux moteurs de recherche.
const SERVICES = Object.freeze([
  { key: 'orientation', stage: 1, title: 'Accueil et orientation', titleEn: 'Welcome and guidance', promise: 'Information sur le parcours de l’investisseur et premier diagnostic de projet en 15 minutes.' },
  { key: 'regimes', stage: 3, title: 'Régimes d’investissement', titleEn: 'Investment regimes', promise: 'Conditions d’éligibilité et accompagnement aux agréments du Code des investissements et de la zone franche.' },
  { key: 'facilitation', stage: 4, title: 'Facilitation administrative', titleEn: 'Administrative facilitation', promise: 'Présentation de la plateforme digitale, orientation et appui dans les démarches auprès des organismes concernés.' },
  { key: 'industrial_site', stage: 4, title: 'Implantation industrielle', titleEn: 'Industrial establishment', promise: 'Information sur le foncier et les zones économiques, selon les disponibilités.' },
  { key: 'aftercare', stage: 5, title: 'Accompagnement après implantation', titleEn: 'Aftercare', promise: 'Recueil et suivi des difficultés des entreprises, appui aux extensions et réinvestissements.' },
  { key: 'partnerships', stage: 5, title: 'Opportunités et partenariats', titleEn: 'Opportunities and partnerships', promise: 'Promotion des secteurs porteurs, mise en relation investisseurs, industriels et fournisseurs.' },
]);
const SERVICE_KEYS = SERVICES.map((service) => service.key);

// Les cinq étapes « Investir au Togo en 5 étapes ».
const STAGES = Object.freeze(['S’informer', 'Structurer son projet', 'Choisir son régime', 'S’implanter', 'Développer ses activités']);

// Les douze démarches déjà en ligne.
const PROCEDURES = Object.freeze([
  'Demande d’agrément provisoire en Zone Franche',
  'Renouvellement d’agrément provisoire en Zone Franche',
  'Suspension d’un agrément provisoire en Zone Franche',
  'Réactivation d’un agrément provisoire en Zone Franche',
  'Demande d’agrément définitif en Zone Franche',
  'Modification du nom sur un agrément en Zone Franche',
  'Ajout d’activités sur un agrément en Zone Franche',
  'Contrat de travail en Zone Franche',
  'Demande d’agrément au Code des investissements',
  'Modification du nom sur un agrément au Code des investissements',
  'Demande de Carnet Bleu',
  'Renouvellement de Carnet Bleu',
]);

const serviceTitle = (key, language = 'fr') => {
  const service = SERVICES.find((item) => item.key === key);
  if (!service) return null;
  return language === 'en' ? service.titleEn : service.title;
};

module.exports = { SERVICES, SERVICE_KEYS, STAGES, PROCEDURES, serviceTitle };
