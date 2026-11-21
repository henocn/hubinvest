import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSiteSettings } from '../lib/settings';
import GuichetBooking from '../components/GuichetBooking';
import InvestorRequestForm from '../components/InvestorRequestForm';
import StepSummary from '../components/StepSummary';

const GUICHETS = ['project', 'regime', 'company'];

// Les trois guichets du Stand API-ZF (document v4, M3), une étape à la fois : la question qui amène la personne,
// puis le créneau et les coordonnées (rendez-vous) ou la demande (rappel). Une étape faite se replie en une ligne.
export default function GuichetsPage({ mode = 'book' }) {
  const { t } = useTranslation();
  const settings = useSiteSettings();
  const [guichet, setGuichet] = useState('');
  const panelRef = useRef(null);

  // À chaque étape, le haut du parcours revient sous les yeux.
  useEffect(() => {
    if (guichet) panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [guichet]);

  return (
    <main className="public-container investor-desk-page guichets-page">
      <h1 className="guichets-title">{t('guichets.title')}</h1>
      <nav className="guichet-modes" aria-label={t('guichets.modes')}>
        <Link to="/guichets" className={mode === 'book' ? 'is-active' : ''} aria-current={mode === 'book' ? 'page' : undefined}>{t('home.book')}</Link>
        <Link to="/guichets/rappel" className={mode === 'callback' ? 'is-active' : ''} aria-current={mode === 'callback' ? 'page' : undefined}>{t('home.callBack')}</Link>
      </nav>
      {!settings.investorDeskOpen ? <p className="public-message is-closed">{t('closed.investor')}</p> : (
        <section className="investor-request-panel booking-panel" ref={panelRef}>
          {!guichet ? (
            <div className="guichet-choice" role="group" aria-labelledby="guichet-choice-title">
              <h2 id="guichet-choice-title">{t('guichets.choose')}</h2>
              {GUICHETS.map((key, index) => (
                <button key={key} type="button" onClick={() => setGuichet(key)}>
                  <span className="guichet-number">{t('guichets.number', { number: index + 1 })}</span>
                  <strong>{t(`guichets.names.${key}`)}</strong>
                  <small>{t(`guichets.hints.${key}`)}</small>
                </button>
              ))}
            </div>
          ) : (
            <>
              <StepSummary label={t('guichets.desk')} value={t(`guichets.names.${guichet}`)} onEdit={() => setGuichet('')} />
              {mode === 'book' ? <GuichetBooking key={guichet} guichet={guichet} /> : <InvestorRequestForm key={guichet} guichet={guichet} />}
            </>
          )}
        </section>
      )}
    </main>
  );
}
