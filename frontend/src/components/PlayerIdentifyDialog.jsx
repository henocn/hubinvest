import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import PublicDialog from './PublicDialog';
import { api } from '../lib/api';
import { formatPhoneInput, toInternationalPhone } from '../lib/phone';
import { publicErrorMessage } from '../lib/public-error';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_CHARACTERS = /^[+\d\s().-]*$/;

// Le joueur donne un e-mail ou un téléphone : l'e-mail est gardé tel quel, le numéro passe au format international.
const normalizeContact = (value) => {
  const contact = value.trim();
  if (contact.includes('@')) return EMAIL.test(contact) ? contact.toLowerCase() : '';
  return toInternationalPhone(contact);
};

// Identifie le joueur une seule fois pour les deux jeux des Défis, avec deux champs seulement.
export default function PlayerIdentifyDialog({ onClose, onIdentified }) {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState('');
  const [contact, setContact] = useState('');
  const [contactError, setContactError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Un numéro se met en forme pendant la saisie ; dès qu'une lettre ou un @ apparaît, la valeur reste libre.
  const changeContact = (event) => {
    const { value } = event.target;
    setContact(PHONE_CHARACTERS.test(value) && /\d/.test(value) ? formatPhoneInput(value) : value);
    setContactError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    const normalized = normalizeContact(contact);
    if (!normalized) {
      setContactError(t('play.contactInvalid'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      onIdentified(await api.createChallengePassport({ fullName: fullName.trim(), contact: normalized }));
    } catch (requestError) {
      setError(publicErrorMessage(t, requestError));
      setLoading(false);
    }
  };

  return (
    <PublicDialog title={t('play.identifyTitle')} intro={t('play.identifyIntro')} onClose={onClose} locked={loading}>
      <form className="player-form" onSubmit={submit} noValidate>
        <label>{t('play.fullName')}<input value={fullName} onChange={(event) => setFullName(event.target.value)} minLength={2} maxLength={120} autoComplete="name" autoFocus required /></label>
        <label>
          {t('play.contact')}
          <input value={contact} onChange={changeContact} maxLength={180} autoComplete="on" autoCapitalize="none" spellCheck="false" aria-invalid={Boolean(contactError)} required />
          {contactError && <small className="field-hint is-error" role="alert">{contactError}</small>}
        </label>
        {error && <p className="request-error" role="alert">{error}</p>}
        <button className="button button-primary button-large" type="submit" disabled={loading || fullName.trim().length < 2 || !contact.trim()}>{loading ? t('play.identifying') : t('play.identifySubmit')}<ArrowRight size={18} /></button>
      </form>
    </PublicDialog>
  );
}
