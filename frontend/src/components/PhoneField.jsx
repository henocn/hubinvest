import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatPhoneInput, isValidPhone } from '../lib/phone';

// Champ téléphone obligatoire : mis en forme pendant la saisie, signalé s'il reste invalide en quittant le champ.
export default function PhoneField({ value, onChange, label, showError = false }) {
  const { t } = useTranslation();
  const [touched, setTouched] = useState(false);
  const invalid = (touched || showError) && value.trim().length > 0 && !isValidPhone(value);

  return (
    <label>
      {label || t('fields.phone')}
      <input
        type="tel"
        inputMode="tel"
        value={value}
        onChange={(event) => onChange(formatPhoneInput(event.target.value))}
        onBlur={() => setTouched(true)}
        placeholder="+228 90 12 34 56"
        maxLength={24}
        autoComplete="tel"
        aria-invalid={invalid || undefined}
        required
      />
      {invalid && <small className="field-hint is-error">{t('fields.phoneInvalid')}</small>}
    </label>
  );
}
