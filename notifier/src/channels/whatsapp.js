const config = require('../config');

// WhatsApp Business (API Cloud de Meta) : uniquement des modèles approuvés (catégorie UTILITY), envoyés à un numéro au
// format international. Les modèles et leurs textes sont dans whatsapp/templates.json.
const { whatsapp } = config;

const isConfigured = () => Boolean(whatsapp.token && whatsapp.phoneNumberId);

// +228 90 12 34 56 → 22890123456 (Meta attend les chiffres seuls, indicatif compris).
const toWhatsappNumber = (phone) => String(phone || '').replace(/\D/g, '');

// Corps de l'appel : le modèle, sa langue et les valeurs de ses variables {{1}}, {{2}}… dans l'ordre.
const messageBody = (to, { template, language = 'fr', params = [] }) => ({
  messaging_product: 'whatsapp',
  to: toWhatsappNumber(to),
  type: 'template',
  template: {
    name: template,
    language: { code: language === 'en' ? 'en' : 'fr' },
    components: params.length ? [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text: String(text) })) }] : [],
  },
});

// Erreurs de Meta qui passent en réessayant plus tard (débit, panne passagère) ; les autres sont définitives pour ce
// message (numéro sans WhatsApp, modèle absent ou mal rempli, jeton invalide) et l'e-mail prend le relais.
const RETRYABLE_CODES = new Set([1, 2, 4, 17, 341, 80007, 130429, 131000, 131016, 131048, 131056, 133004]);

class WhatsappError extends Error {
  constructor(message, { code = null, status = null, retryable = false } = {}) {
    super(message);
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

const classify = (status, error) => {
  const code = error?.code ?? null;
  const retryable = status >= 500 || status === 429 || RETRYABLE_CODES.has(code);
  const detail = error?.error_data?.details || error?.message || `HTTP ${status}`;
  return new WhatsappError(`WhatsApp ${code ?? status} : ${detail}`, { code, status, retryable });
};

const send = async (to, message) => {
  if (!isConfigured()) throw new WhatsappError('WhatsApp non configuré.', { retryable: false });
  if (!toWhatsappNumber(to)) throw new WhatsappError('Numéro absent.', { retryable: false });
  let response;
  try {
    response = await fetch(`https://graph.facebook.com/${whatsapp.apiVersion}/${whatsapp.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${whatsapp.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(messageBody(to, message)),
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    throw new WhatsappError(`WhatsApp injoignable : ${error.message}`, { retryable: true });
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw classify(response.status, body.error);
  return body.messages?.[0]?.id || null;
};

module.exports = { isConfigured, send, messageBody, toWhatsappNumber, classify, WhatsappError };
