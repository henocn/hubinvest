import { AsYouType, parsePhoneNumberFromString } from 'libphonenumber-js';

// Sans indicatif, un numéro est lu comme togolais.
export const DEFAULT_PHONE_COUNTRY = 'TG';

// Met en forme le numéro pendant la saisie, avec les espaces du pays détecté.
export const formatPhoneInput = (value) => {
  const cleaned = String(value || '').replace(/[^\d+\s().-]/g, '');
  if (!cleaned.trim()) return '';
  return new AsYouType(DEFAULT_PHONE_COUNTRY).input(cleaned);
};

const parsePhone = (value) => parsePhoneNumberFromString(String(value || ''), DEFAULT_PHONE_COUNTRY);

export const isValidPhone = (value) => Boolean(parsePhone(value)?.isValid());

// Renvoie le numéro au format international (+228…) pour l'enregistrer, ou une chaîne vide s'il n'est pas valide.
export const toInternationalPhone = (value) => {
  const phone = parsePhone(value);
  return phone?.isValid() ? phone.number : '';
};

// Affiche un numéro enregistré dans un format lisible.
export const displayPhone = (value) => {
  const phone = parsePhone(value);
  return phone?.isValid() ? phone.formatInternational() : String(value || '');
};
