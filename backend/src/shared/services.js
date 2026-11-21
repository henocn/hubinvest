// Les six services de l'API-ZF (document v4, § 02), écrits dans le code : une mise à jour se fait ici.
// Le site public et le back office ont la même liste (frontend/src/content/services.js, backoffice constants/access.js).
const SERVICES = Object.freeze([
  { key: 'orientation', title: 'Accueil et orientation', titleEn: 'Welcome and guidance' },
  { key: 'regimes', title: 'Régimes d’investissement', titleEn: 'Investment regimes' },
  { key: 'facilitation', title: 'Facilitation administrative', titleEn: 'Administrative facilitation' },
  { key: 'industrial_site', title: 'Implantation industrielle', titleEn: 'Industrial establishment' },
  { key: 'aftercare', title: 'Accompagnement après implantation', titleEn: 'Aftercare' },
  { key: 'partnerships', title: 'Opportunités et partenariats', titleEn: 'Opportunities and partnerships' },
]);
const SERVICE_KEYS = SERVICES.map((service) => service.key);

const serviceTitle = (key, language = 'fr') => {
  const service = SERVICES.find((item) => item.key === key);
  if (!service) return null;
  return language === 'en' ? service.titleEn : service.title;
};

module.exports = { SERVICES, SERVICE_KEYS, serviceTitle };
