const fs = require('node:fs');
const path = require('node:path');
const env = require('../../config/env');
const seoRepository = require('./seo.repository');
const { SERVICES, STAGES, PROCEDURES } = require('../../shared/services');

const SITE_NAME = 'Hub de l’Investissement';
const ORGANIZATION = 'API-ZF';
const ORGANIZATION_FULL = 'Agence de Promotion des Investissements et de la Zone Franche du Togo';
const DEFAULT_DESCRIPTION = 'Investir au Togo avec l’API-ZF : rendez-vous aux guichets du Stand API-ZF, agréments Zone Franche et Code des investissements, 12 démarches en ligne, Espace Industrie et rencontres B2B à la Foire internationale de Lomé 2026.';

// Foire internationale de Lomé 2026 (document v4) : dates et lieu de la participation de l'API-ZF.
const FAIR = { name: 'Foire internationale de Lomé 2026 (FIL 2026) · Stand API-ZF et Espace Industrie', startDate: '2026-11-27', endDate: '2026-12-13', place: 'Pavillon Oti, Foire internationale de Lomé' };

// Pages publiques fixes : elles sont indexées et listées dans le sitemap.
const STATIC_PAGES = {
  '/': {
    title: 'Investir au Togo avec l’API-ZF · Hub de l’Investissement, FIL 2026',
    description: DEFAULT_DESCRIPTION,
    priority: '1.0',
  },
  '/guichets': {
    title: `Rendez-vous aux guichets de l’API-ZF · Investir au Togo · ${SITE_NAME}`,
    description: 'Prenez rendez-vous au Stand API-ZF : diagnostic de votre projet d’investissement en 15 minutes, régime Zone Franche ou Code des investissements, accompagnement des entreprises installées.',
    priority: '0.9',
  },
  '/stands': {
    title: `Entreprises de l’Espace Industrie · ${SITE_NAME}`,
    description: 'Les entreprises accompagnées par l’API-ZF à la Foire internationale de Lomé 2026 : ce que le Togo produit, leurs activités, produits et services.',
    priority: '0.9',
  },
  '/b2b': {
    title: `Rencontres B2B · ${SITE_NAME}`,
    description: 'Les besoins publiés par les entreprises de l’Espace Industrie : proposez une rencontre B2B de 20 minutes et trouvez une opportunité d’investissement au Togo.',
    priority: '0.8',
  },
  '/rencontres': {
    title: `Rencontrer l’API-ZF et les entreprises · ${SITE_NAME}`,
    description: 'Guichets de l’API-ZF et rencontres B2B : rencontrez un expert de l’API-ZF ou une entreprise de l’Espace Industrie.',
    priority: '0.8',
  },
  '/guichets/rappel': {
    title: `Être recontacté par l’API-ZF · ${SITE_NAME}`,
    description: 'Laissez vos coordonnées et votre question sur votre projet d’investissement au Togo : un expert de l’API-ZF vous recontacte.',
    priority: '0.7',
  },
  '/defis': {
    title: `Trouvez les 5 étapes et la roue des opportunités · ${SITE_NAME}`,
    description: 'Le jeu de la Foire internationale de Lomé : scannez le QR de 4 stands de l’Espace Industrie, répondez à deux questions et récupérez votre récompense au Stand API-ZF, et tentez votre chance à la roue des opportunités.',
    priority: '0.6',
  },
};

// Pages accessibles sans compte mais sans intérêt pour les moteurs : elles renvoient vers leur page de référence.
const ALIASES = { '/roue': '/defis', '/investor-desk': '/guichets/rappel' };

// Espaces privés, liens personnels et formulaires de connexion : jamais indexés.
const PRIVATE_PAGES = [
  /^\/connexion$/,
  /^\/mot-de-passe-oublie$/,
  /^\/administration(\/.*)?$/,
  /^\/espace-(occupant|animateur)(\/.*)?$/,
  /^\/studio\/[^/]+$/,
  /^\/ecran$/,
  /^\/defis\/[^/]+$/,
];

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// Résumé d'un texte libre pour la balise description : une ligne, coupée proprement vers 160 caractères.
const summarize = (text, max = 160) => {
  const flat = String(text || '').replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 30)).replace(/[\s,;:.–-]+$/, '')}…`;
};

const absoluteUrl = (value) => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `${env.appUrls.public}${value.startsWith('/') ? '' : '/'}${value}`;
};

const organizationLd = () => ({
  '@type': 'GovernmentOrganization',
  name: ORGANIZATION_FULL,
  alternateName: ORGANIZATION,
  areaServed: 'TG',
});

const websiteLd = () => ({
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'WebSite', name: SITE_NAME, alternateName: ['HubInvest', 'Investir au Togo'], url: `${env.appUrls.public}/`, inLanguage: ['fr', 'en'], publisher: organizationLd() },
    {
      ...organizationLd(),
      logo: absoluteUrl('/pwa-512.png'),
      slogan: 'Investir au Togo, nous facilitons votre réussite.',
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Les services de l’API-ZF',
        itemListElement: SERVICES.map((service) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: service.title, description: service.promise, areaServed: 'TG' } })),
      },
    },
    {
      '@type': 'Event',
      name: FAIR.name,
      startDate: FAIR.startDate,
      endDate: FAIR.endDate,
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: { '@type': 'Place', name: FAIR.place, address: { '@type': 'PostalAddress', addressLocality: 'Lomé', addressCountry: 'TG' } },
      organizer: organizationLd(),
      description: 'Le Stand API-ZF et l’Espace Industrie : les services de l’API-ZF, les démarches en ligne et les entreprises accompagnées.',
      url: `${env.appUrls.public}/`,
      image: absoluteUrl('/og-image.png'),
    },
  ],
});

const breadcrumbLd = (items) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, url], index) => ({ '@type': 'ListItem', position: index + 1, name, item: absoluteUrl(url) })),
});

const link = (href, text) => `<a href="${href}">${escapeHtml(text)}</a>`;
const navigation = () => `<nav>${[['/', 'Accueil'], ['/guichets', 'Prendre rendez-vous aux guichets'], ['/stands', 'Entreprises'], ['/b2b', 'Rencontres B2B'], ['/defis', 'Trouvez les 5 étapes']].map(([href, text]) => link(href, text)).join(' · ')}</nav>`;

// Accueil : la signature, les services par étape du parcours et les démarches en ligne.
const homeBody = () => [
  '<h1>Investir au Togo, nous facilitons votre réussite.</h1>',
  '<p>Le Hub de l’Investissement de l’API-ZF (Agence de Promotion des Investissements et de la Zone Franche) à la Foire internationale de Lomé 2026, du 27 novembre au 13 décembre, pavillon Oti : le Stand API-ZF et ses trois guichets, l’Espace Industrie et ses entreprises.</p>',
  '<h2>Nos services</h2>',
  ...STAGES.map((stage, index) => {
    const items = SERVICES.filter((service) => service.stage === index + 1);
    return `<h3>${index + 1}. ${escapeHtml(stage)}</h3>${items.map((service) => `<p><strong>${escapeHtml(service.title)}</strong> : ${escapeHtml(service.promise)}</p>`).join('')}`;
  }),
  `<h2>Les ${PROCEDURES.length} démarches déjà en ligne</h2>`,
  `<ul>${PROCEDURES.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`,
  `<p>${link('/guichets', 'Prendre rendez-vous à un guichet de l’API-ZF')} · ${link('/guichets/rappel', 'Être recontacté')}</p>`,
].join('');

const guichetsBody = () => [
  '<h1>Les guichets du Stand API-ZF</h1>',
  '<h2>Guichet 1 · Mon projet d’investissement</h2><p>Diagnostic de votre projet en 15 minutes et orientation.</p>',
  '<h2>Guichet 2 · Quel régime pour mon investissement ?</h2><p>Code des investissements, Zone Franche, agréments, foncier.</p>',
  '<h2>Guichet 3 · Mon entreprise, mes difficultés</h2><p>Entreprise installée : une difficulté, une extension, un réinvestissement, avec un engagement de suivi écrit.</p>',
].join('');

const standsBody = async () => {
  const stands = await seoRepository.listStands();
  return `<h1>Les entreprises de l’Espace Industrie</h1><ul>${stands.map((stand) => `<li>${link(`/stands/${stand.slug}`, stand.name)}</li>`).join('')}</ul>`;
};

const needsBody = async () => {
  const needs = await seoRepository.listNeeds();
  return `<h1>Rencontres B2B</h1><ul>${needs.map((need) => `<li>${link(`/b2b/${need.id}`, `${need.title} · ${need.occupant.name}`)}</li>`).join('')}</ul>`;
};

const STATIC_BODIES = { '/': homeBody, '/guichets': guichetsBody, '/stands': standsBody, '/b2b': needsBody };

const notFoundMeta = () => ({ status: 404, title: `Page introuvable · ${SITE_NAME}`, description: DEFAULT_DESCRIPTION, robots: 'noindex' });

// Fiche d'un stand : nom, activité, image et données structurées de l'organisation présente.
const standMeta = async (slug) => {
  const stand = await seoRepository.findStand(slug);
  if (!stand) return notFoundMeta();
  const url = `/stands/${stand.slug}`;
  const description = stand.activity
    ? summarize(`${stand.name} au Hub de l’Investissement${stand.standLabel ? ` (${stand.standLabel})` : ''} : ${stand.activity}`)
    : `Découvrez ${stand.name}, présent au Hub de l’Investissement de l’API-ZF${stand.standLabel ? `, ${stand.standLabel}` : ''}, et demandez à être recontacté.`;
  const image = absoluteUrl(stand.coverImageUrl || stand.logoUrl);
  return {
    body: `<h1>${escapeHtml(stand.name)}</h1>${stand.standLabel ? `<p>${escapeHtml(stand.standLabel)}</p>` : ''}${stand.activity ? `<p>${escapeHtml(stand.activity)}</p>` : ''}`,
    title: `${stand.name} · Entreprises · ${SITE_NAME}`,
    description,
    canonical: url,
    image,
    type: 'profile',
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          name: stand.name,
          url: absoluteUrl(url),
          ...(stand.activity && { description: summarize(stand.activity, 300) }),
          ...(stand.logoUrl && { logo: absoluteUrl(stand.logoUrl) }),
          ...(image && { image }),
        },
        breadcrumbLd([[SITE_NAME, '/'], ['Entreprises', '/stands'], [stand.name, url]]),
      ],
    },
  };
};

// Besoin B2B publié : titre, description et structure qui l'a publié.
const needMeta = async (id) => {
  const need = await seoRepository.findNeed(id);
  if (!need) return notFoundMeta();
  const url = `/b2b/${need.id}`;
  return {
    body: `<h1>${escapeHtml(need.title)}</h1><p>${escapeHtml(need.occupant.name)}</p>${need.description ? `<p>${escapeHtml(need.description)}</p>` : ''}`,
    title: `${need.title} · Besoin B2B de ${need.occupant.name} · ${SITE_NAME}`,
    description: summarize(`${need.occupant.name} recherche : ${need.description || need.title}`),
    canonical: url,
    image: absoluteUrl(need.occupant.coverImageUrl || need.occupant.logoUrl),
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [breadcrumbLd([[SITE_NAME, '/'], ['Rencontres B2B', '/b2b'], [need.title, url]])],
    },
  };
};

// Balises de la page demandée. Une erreur de base de données ne doit jamais empêcher le site de s'afficher.
const pageMeta = async (pathname) => {
  const page = pathname.replace(/\/+$/, '') || '/';
  if (PRIVATE_PAGES.some((pattern) => pattern.test(page))) return { title: SITE_NAME, description: DEFAULT_DESCRIPTION, robots: 'noindex, nofollow' };
  const reference = ALIASES[page] || page;
  if (STATIC_PAGES[reference]) {
    const { title, description } = STATIC_PAGES[reference];
    let body = null;
    try {
      body = STATIC_BODIES[reference] ? await STATIC_BODIES[reference]() : null;
    } catch (error) {
      console.error('Contenu SEO indisponible', reference, error.message);
    }
    return { title, description, canonical: reference, body, jsonLd: reference === '/' ? websiteLd() : undefined };
  }

  try {
    const stand = page.match(/^\/stands\/([a-z0-9-]+)$/);
    if (stand) return await standMeta(stand[1]);
    const need = page.match(/^\/b2b\/([a-f0-9-]+)$/i);
    if (need) return await needMeta(need[1]);
  } catch (error) {
    console.error('Balises SEO indisponibles', page, error.message);
    return { title: SITE_NAME, description: DEFAULT_DESCRIPTION, canonical: page };
  }

  return notFoundMeta();
};

const renderTags = (meta) => {
  const canonical = meta.canonical ? absoluteUrl(meta.canonical) : null;
  const image = meta.image || absoluteUrl('/og-image.png');
  const tags = [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<meta name="robots" content="${meta.robots || 'index, follow, max-image-preview:large'}" />`,
    canonical && `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    '<meta property="og:locale" content="fr_FR" />',
    '<meta property="og:locale:alternate" content="en_GB" />',
    `<meta property="og:type" content="${meta.type || 'website'}" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    canonical && `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
    meta.jsonLd && `<script type="application/ld+json">${JSON.stringify(meta.jsonLd).replace(/</g, '\\u003c')}</script>`,
  ];
  return tags.filter(Boolean).join('\n    ');
};

// index.html du build, relu seulement lorsqu'un nouveau déploiement l'a remplacé.
let template = { mtime: 0, html: '' };
const readTemplate = () => {
  const file = path.join(env.frontendDist, 'index.html');
  const { mtimeMs } = fs.statSync(file);
  if (mtimeMs !== template.mtime) template = { mtime: mtimeMs, html: fs.readFileSync(file, 'utf8') };
  return template.html;
};

const SEO_BLOCK = /<!--seo-->[\s\S]*?<!--\/seo-->/;

const renderPage = async (pathname) => {
  const meta = await pageMeta(pathname);
  let html = readTemplate().replace(SEO_BLOCK, () => `<!--seo-->\n    ${renderTags(meta)}\n    <!--/seo-->`);
  // Le texte de la page dans le HTML servi : les moteurs le lisent sans exécuter le JavaScript ; React le remplace aussitôt.
  if (meta.body) html = html.replace('<div id="root"></div>', () => `<div id="root"><main class="seo-content">${navigation()}${meta.body}</main></div>`);
  return { status: meta.status || 200, html };
};

const sitemapUrl = (loc, lastmod, priority) => [
  '  <url>',
  `    <loc>${escapeHtml(absoluteUrl(loc))}</loc>`,
  lastmod && `    <lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>`,
  priority && `    <priority>${priority}</priority>`,
  '  </url>',
].filter(Boolean).join('\n');

const sitemap = async () => {
  const [stands, needs] = await Promise.all([seoRepository.listStands(), seoRepository.listNeeds()]);
  const urls = [
    ...Object.entries(STATIC_PAGES).map(([loc, page]) => sitemapUrl(loc, null, page.priority)),
    ...stands.map((stand) => sitemapUrl(`/stands/${stand.slug}`, stand.updatedAt, '0.7')),
    ...needs.map((need) => sitemapUrl(`/b2b/${need.id}`, need.updatedAt, '0.5')),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
};

module.exports = { pageMeta, renderPage, renderTags, sitemap, summarize };
