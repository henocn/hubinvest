import { useState } from 'react';
import PhoneInput from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';
import fr from 'react-phone-number-input/locale/fr';
import en from 'react-phone-number-input/locale/en';
import 'react-phone-number-input/style.css';
import { useTranslation } from 'react-i18next';
import { isValidPhone } from '../lib/phone';

// Champ téléphone obligatoire, comme sur la Semaine de l'Industrie : le pays (drapeau, Togo par défaut) et son
// indicatif fixe, le numéro mis en forme à la saisie, refusé s'il n'existe pas pour ce pays. La valeur est au format
// international (+22890123456).
export default function PhoneField({ value, onChange, label, showError = false }) {
  const { t, i18n } = useTranslation();
  const [touched, setTouched] = useState(false);
  const invalid = (touched || showError) && Boolean(value) && !isValidPhone(value);

  return (
    <label className="phone-field">
      {label || t('fields.phone')}
      <PhoneInput
        international
        countryCallingCodeEditable={false}
        defaultCountry="TG"
        labels={i18n.resolvedLanguage?.startsWith('en') ? en : fr}
        flags={flags}
        value={value || undefined}
        onChange={(next) => onChange(next || '')}
        onBlur={() => setTouched(true)}
        autoComplete="tel"
        aria-invalid={invalid || undefined}
        required
      />
      {invalid && <small className="field-hint is-error">{t('fields.phoneInvalid')}</small>}
    </label>
  );
}
