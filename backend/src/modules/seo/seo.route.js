const express = require('express');
const asyncHandler = require('../../shared/async-handler');
const seoService = require('./seo.service');

const router = express.Router();

router.get('/sitemap.xml', asyncHandler(async (request, response) => {
  response.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(await seoService.sitemap());
}));

// Pages du site : index.html du build avec le titre, la description et les balises de partage de la page.
// Les fichiers absents (extension présente) restent de vraies 404 de l'API.
router.get(/^\/(?!api\/|uploads\/)(?:[^.]*)$/, asyncHandler(async (request, response) => {
  const { status, html } = await seoService.renderPage(request.path);
  response.status(status).type('html').set('Cache-Control', 'no-cache').send(html);
}));

module.exports = router;
