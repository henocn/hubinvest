import { useEffect, useRef } from 'react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';
import fr from 'react-phone-number-input/locale/fr';
import 'react-phone-number-input/style.css';
import { toInternationalPhone } from '../lib/phone';

// Téléphone, comme sur la Semaine de l'Industrie : le pays (drapeau, Togo par défaut) et son indicatif fixe, le numéro
// mis en forme à la saisie. Un numéro qui n'existe pas pour ce pays bloque l'envoi du formulaire. Valeur : +22890123456.
export default function PhoneInputField({ label = 'Téléphone', value, onChange, required = false }) {
  const boxRef = useRef(null);
  // Un numéro déjà enregistré sans indicatif est relu comme togolais ; une saisie en cours (+228…) est gardée telle quelle.
  const current = toInternationalPhone(value) || (String(value || '').startsWith('+') ? value : undefined);

  useEffect(() => {
    let message = '';
    if (current && !isValidPhoneNumber(current)) message = 'Numéro invalide pour le pays choisi.';
    else if (!current && required) message = 'Renseignez un numéro de téléphone.';
    boxRef.current?.querySelector('.PhoneInputInput')?.setCustomValidity(message);
  }, [current, required]);

  return (
    <label className="phone-field" ref={boxRef}>
      {label}
      <PhoneInput
        international
        countryCallingCodeEditable={false}
        defaultCountry="TG"
        labels={fr}
        flags={flags}
        value={current}
        onChange={(next) => onChange(next || '')}
        autoComplete="tel"
      />
    </label>
  );
}
