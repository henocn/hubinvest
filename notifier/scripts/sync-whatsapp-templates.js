// Crée chez Meta les modèles WhatsApp de whatsapp/templates.json qui n'existent pas encore (FR et EN).
// Sans --apply : affiche seulement ce qui serait créé et l'état des modèles existants (APPROVED, PENDING, REJECTED).
// Un modèle existant n'est jamais modifié : Meta repasserait la validation et pourrait changer sa catégorie.
// Pour corriger un texte, ajouter un nouveau nom (suffixe _v2) dans templates.json, puis l'utiliser dans l'API.
const path = require('path');
const config = require('../src/config');
const definitions = require(path.resolve(__dirname, '..', 'whatsapp', 'templates.json'));

const apply = process.argv.includes('--apply');
const { token, businessAccountId, apiVersion } = config.whatsapp;
const base = `https://graph.facebook.com/${apiVersion}/${businessAccountId}/message_templates`;

const call = async (url, options = {}) => {
  const response = await fetch(url, { ...options, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${body.error?.code ?? response.status} : ${body.error?.error_user_msg || body.error?.message || 'erreur Meta'}`);
  return body;
};

const existingTemplates = async () => {
  const found = new Map();
  let url = `${base}?fields=name,language,status,category&limit=200`;
  while (url) {
    const page = await call(url); // eslint-disable-line no-await-in-loop
    page.data.forEach((item) => found.set(`${item.name}:${item.language}`, item));
    url = page.paging?.next || null;
  }
  return found;
};

const payloadFor = (template, language) => ({
  name: template.name,
  language,
  category: 'UTILITY',
  // Meta refuse le modèle plutôt que de le passer en MARKETING sans prévenir (leçon de la SDI).
  allow_category_change: false,
  components: [
    { type: 'BODY', text: template[language].text, example: { body_text: [template[language].example] } },
    { type: 'FOOTER', text: definitions.footer[language] },
  ],
});

const main = async () => {
  if (!token || !businessAccountId) throw new Error('WHATSAPP_TOKEN et WHATSAPP_BUSINESS_ACCOUNT_ID sont nécessaires.');
  const existing = await existingTemplates();
  for (const template of definitions.templates) {
    for (const language of ['fr', 'en']) {
      const key = `${template.name}:${language}`;
      const current = existing.get(key);
      if (current) {
        console.log(`= ${key} existe : ${current.status} (${current.category})`);
        continue; // eslint-disable-line no-continue
      }
      if (!apply) {
        console.log(`+ ${key} serait créé`);
        continue; // eslint-disable-line no-continue
      }
      const created = await call(base, { method: 'POST', body: JSON.stringify(payloadFor(template, language)) }); // eslint-disable-line no-await-in-loop
      console.log(`+ ${key} créé : ${created.status || 'PENDING'} (${created.category || 'UTILITY'})`);
    }
  }
  if (!apply) console.log('\nAucune création : relancer avec --apply pour soumettre les modèles manquants à Meta.');
};

main().catch((error) => {
  console.error(`Synchronisation impossible : ${error.message}`);
  process.exit(1);
});
