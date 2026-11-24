// Les six services de l'API-ZF et les douze démarches en ligne (document v4, § 02), écrits dans le code :
// une mise à jour se fait ici. `stage` = étape du parcours « Investir au Togo en 5 étapes » (1 à 5).
// Les démarches se font sur la plateforme officielle de l'API-ZF (PROCEDURES_URL).
export const PROCEDURES_URL = 'https://services.apizf.tg/';
export const services = [
  {
    key: 'orientation',
    stage: 1,
    fr: { title: 'Accueil et orientation', promise: 'Information sur le parcours de l’investisseur et premier diagnostic de projet.', place: 'Guichet « Mon projet d’investissement » : diagnostic en 15 minutes et prise de rendez-vous' },
    en: { title: 'Welcome and guidance', promise: 'Information on the investor’s journey and a first project diagnosis.', place: '“My investment project” desk: a 15-minute diagnosis and appointment booking' },
  },
  {
    key: 'regimes',
    stage: 3,
    fr: { title: 'Régimes d’investissement', promise: 'Conditions d’éligibilité et accompagnement aux agréments du Code des investissements et de la zone franche.', place: 'Guichet « Quel régime pour mon investissement ? » : orientation personnalisée' },
    en: { title: 'Investment regimes', promise: 'Eligibility conditions and support with Investment Code and free zone approvals.', place: '“Which regime for my investment?” desk: tailored guidance' },
  },
  {
    key: 'facilitation',
    stage: 4,
    fr: { title: 'Facilitation administrative', promise: 'Présentation de la plateforme digitale, orientation et appui dans les démarches auprès des organismes concernés.', place: 'Tablettes « Services en ligne » : démonstration des 12 démarches' },
    en: { title: 'Administrative facilitation', promise: 'A tour of the digital platform, guidance and support with procedures before the relevant bodies.', place: '“Online services” tablets: a demonstration of the 12 procedures' },
  },
  {
    key: 'industrial_site',
    stage: 4,
    limited: true,
    fr: { title: 'Implantation industrielle', promise: 'Information sur le foncier et les zones économiques.', place: 'Guichet « Quel régime pour mon investissement ? », sur rendez-vous' },
    en: { title: 'Industrial establishment', promise: 'Information on land and economic zones.', place: '“Which regime for my investment?” desk, by appointment' },
  },
  {
    key: 'aftercare',
    stage: 5,
    fr: { title: 'Accompagnement après implantation', promise: 'Recueil et suivi des difficultés des entreprises, appui aux extensions et réinvestissements.', place: 'Guichet « Mon entreprise, mes difficultés » : recueil structuré et engagement de suivi' },
    en: { title: 'Aftercare', promise: 'Recording and follow-up of companies’ difficulties, support for expansions and reinvestments.', place: '“My company, my difficulties” desk: structured intake and a follow-up commitment' },
  },
  {
    key: 'partnerships',
    stage: 5,
    fr: { title: 'Opportunités et partenariats', promise: 'Promotion des secteurs porteurs, mise en relation investisseurs, industriels et fournisseurs.', place: 'Espace Industrie, rencontres B2B, bourse des besoins' },
    en: { title: 'Opportunities and partnerships', promise: 'Promotion of growth sectors, connecting investors, manufacturers and suppliers.', place: 'Industry Area, B2B meetings, needs exchange' },
  },
];

export const procedures = [
  { domain: 'free_zone', fr: 'Demande d’agrément provisoire en Zone Franche', en: 'Application for provisional Free Zone approval' },
  { domain: 'free_zone', fr: 'Renouvellement d’agrément provisoire en Zone Franche', en: 'Renewal of provisional Free Zone approval' },
  { domain: 'free_zone', fr: 'Suspension d’un agrément provisoire en Zone Franche', en: 'Suspension of a provisional Free Zone approval' },
  { domain: 'free_zone', fr: 'Réactivation d’un agrément provisoire en Zone Franche', en: 'Reactivation of a provisional Free Zone approval' },
  { domain: 'free_zone', fr: 'Demande d’agrément définitif en Zone Franche', en: 'Application for final Free Zone approval' },
  { domain: 'free_zone', fr: 'Modification du nom sur un agrément en Zone Franche', en: 'Name change on a Free Zone approval' },
  { domain: 'free_zone', fr: 'Ajout d’activités sur un agrément en Zone Franche', en: 'Adding activities to a Free Zone approval' },
  { domain: 'free_zone', fr: 'Contrat de travail en Zone Franche', en: 'Free Zone employment contract' },
  { domain: 'investment_code', fr: 'Demande d’agrément au Code des investissements', en: 'Application for Investment Code approval' },
  { domain: 'investment_code', fr: 'Modification du nom sur un agrément au Code des investissements', en: 'Name change on an Investment Code approval' },
  { domain: 'blue_book', fr: 'Demande de Carnet Bleu', en: 'Blue Book application' },
  { domain: 'blue_book', fr: 'Renouvellement de Carnet Bleu', en: 'Blue Book renewal' },
].map((procedure, index) => ({ id: index + 1, url: PROCEDURES_URL, ...procedure }));
