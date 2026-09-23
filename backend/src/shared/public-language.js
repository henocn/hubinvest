const publicLanguage = (request) => request.acceptsLanguages('en', 'fr') || 'fr';

module.exports = publicLanguage;
