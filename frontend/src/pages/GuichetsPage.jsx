import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSiteSettings } from '../lib/settings';
import GuichetBooking from '../components/GuichetBooking';
import InvestorRequestForm from '../components/InvestorRequestForm';

const GUICHETS = ['project', 'regime', 'company'];

// Les trois guichets du Stand API-ZF (document v4, M3) : la personne choisit la question qui la concerne,
// puis prend rendez-vous sur un créneau libre ou demande à être recontactée.
export default function GuichetsPage({ mode = 'book' }) {
  const { t } = useTranslation();
  const settings = useSiteSettings();
  const [guichet, setGuichet] = useState('');

  return (
    <main className="public-container investor-desk-page guichets-page">
      <section className="investor-desk-intro">
        <h1>{t('guichets.title')}</h1>
      </section>
      <nav className="guichet-modes" aria-label={t('guichets.modes')}>
        <Link to="/guichets" className={mode === 'book' ? 'is-active' : ''} aria-current={mode === 'book' ? 'page' : undefined}>{t('home.book')}</Link>
        <Link to="/guichets/rappel" className={mode === 'callback' ? 'is-active' : ''} aria-current={mode === 'callback' ? 'page' : undefined}>{t('home.callBack')}</Link>
      </nav>
      {!settings.investorDeskOpen ? <p className="public-message is-closed">{t('closed.investor')}</p> : (
        <section className="investor-request-panel">
          <fieldset className="guichet-choice">
            <legend>{t('guichets.choose')}</legend>
            {GUICHETS.map((key) => (
              <label key={key} className={guichet === key ? 'is-selected' : ''}>
                <input type="radio" name="guichet" value={key} checked={guichet === key} onChange={() => setGuichet(key)} />
                <strong>{t(`guichets.names.${key}`)}</strong>
                <small>{t(`guichets.hints.${key}`)}</small>
              </label>
            ))}
          </fieldset>
          {guichet && (mode === 'book' ? <GuichetBooking key={guichet} guichet={guichet} /> : <InvestorRequestForm key={guichet} guichet={guichet} />)}
        </section>
      )}
    </main>
  );
}
