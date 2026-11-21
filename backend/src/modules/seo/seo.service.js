const fs = require('node:fs');
const path = require('node:path');
const env = require('../../config/env');
const seoRepository = require('./seo.repository');

const SITE_NAME = 'Hub de l’Investissement';
const ORGANIZATION = 'API-ZF';
const ORGANIZATION_FULL = 'Agence de Promotion des Investissements et de la Zone Franche du Togo';
const DEFAULT_DESCRIPTION = 'Le Hub de l’Investissement de l’API-ZF réunit entreprises, institutions et investisseurs au Togo : découvrez les stands, présentez votre projet à l’Investor Desk, consultez les besoins B2B et participez aux défis.';

// Pages publiques fixes : elles sont indexées et listées dans le sitemap.
const STATIC_PAGES = {
  '/': {
    title: `${SITE_NAME} · Investir au Togo avec l’API-ZF`,
    description: DEFAULT_DESCRIPTION,
    priority: '1.0',
  },
  '/stands': {
    title: `Stands et exposants · ${SITE_NAME}`,
    description: 'Annuaire des entreprises et institutions présentes au Hub de l’Investissement de l’API-ZF : activités, stands et mises en relation.',
    priority: '0.9',
  },
  '/guichets': {
    title: `Les guichets du Stand API-ZF · ${SITE_NAME}`,
    description: 'Prenez rendez-vous à l’un des trois guichets du Stand API-ZF : votre projet d’investissement, le régime qui vous convient, les difficultés de votre entreprise.',
    priority: '0.9',
  },
  '/guichets/rappel': {
    title: `Être recontacté par l’API-ZF · ${SITE_NAME}`,
    description: 'Laissez vos coordonnées et votre question : un membre de l’équipe de l’API-ZF vous recontacte.',
    priority: '0.7',
  },
  '/rencontres': {
    title: `Rencontres professionnelles · ${SITE_NAME}`,
    description: 'Rencontres B2B et Investor Desk : choisissez le service du Hub de l’Investissement adapté à votre besoin.',
    priority: '0.8',
  },
  '/b2b': {
    title: `Besoins B2B des exposants · ${SITE_NAME}`,
    description: 'Consultez les besoins publiés par les entreprises du Hub de l’Investissement et proposez votre offre pour décrocher une rencontre B2B.',
    priority: '0.8',
  },
  '/defis': {
    title: `Défis et roue des opportunités · ${SITE_NAME}`,
    description: 'Parcourez les stands du Hub de l’Investissement et tentez votre chance à la roue des opportunités pour gagner des lots.',
    priority: '0.6',
  },
};

// Pages accessibles sans compte mais sans intérêt pour les moteurs : elles renvoient vers leur page de référence.
const ALIASES = { '/roue': '/defis' };

// Espaces privés, liens personnels et formulaires de connexion : jamais indexés.
const PRIVATE_PAGES = [
  /^\/connexion$/,
  /^\/mot-de-passe-oublie$/,
  /^\/administration(\/.*)?$/,
  /^\/espace-(occupant|animateur)(\/.*)?$/,
  /^\/studio\/[^/]+$/,
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
    { '@type': 'WebSite', name: SITE_NAME, alternateName: 'HubInvest', url: `${env.appUrls.public}/`, inLanguage: 'fr', publisher: organizationLd() },
    { ...organizationLd(), logo: absoluteUrl('/pwa-512.png') },
  ],
});

const breadcrumbLd = (items) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, url], index) => ({ '@type': 'ListItem', position: index + 1, name, item: absoluteUrl(url) })),
});

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
    title: `${stand.name} · Stands · ${SITE_NAME}`,
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
        breadcrumbLd([[SITE_NAME, '/'], ['Stands', '/stands'], [stand.name, url]]),
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
    title: `${need.title} · Besoin B2B de ${need.occupant.name} · ${SITE_NAME}`,
    description: summarize(`${need.occupant.name} recherche : ${need.description || need.title}`),
    canonical: url,
    image: absoluteUrl(need.occupant.coverImageUrl || need.occupant.logoUrl),
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [breadcrumbLd([[SITE_NAME, '/'], ['Besoins B2B', '/b2b'], [need.title, url]])],
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
    return { title, description, canonical: reference, jsonLd: reference === '/' ? websiteLd() : undefined };
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
  const html = readTemplate().replace(SEO_BLOCK, () => `<!--seo-->\n    ${renderTags(meta)}\n    <!--/seo-->`);
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
