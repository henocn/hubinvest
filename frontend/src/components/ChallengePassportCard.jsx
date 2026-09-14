import { Check, Gift, MapPin, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ChallengePassportCard({ passport, refreshing, onRefresh }) {
  const { t } = useTranslation();
  const completed = passport.status === 'completed' || passport.status === 'redeemed';
  const progress = Math.min(100, (passport.passageCount / passport.requiredPassages) * 100);

  return (
    <section className={`challenge-passport-card is-${passport.status}`}>
      <header><span>{t('challenge.participant', { name: passport.displayName })}</span><strong>{passport.passageCount} / {passport.requiredPassages}</strong></header>
      <div className="challenge-progress" aria-label={t('challenge.progress', { count: passport.passageCount, total: passport.requiredPassages })}><i style={{ width: `${progress}%` }} /></div>
      <div className="challenge-code"><span>{t('challenge.code')}</span><strong>{passport.code}</strong></div>
      <p className="challenge-next-step">{completed ? <Gift size={19} /> : <MapPin size={19} />}{t(`challenge.${passport.status}`)}</p>
      <button className="button challenge-refresh-button" type="button" onClick={onRefresh} disabled={refreshing}>{refreshing ? t('challenge.refreshing') : t('challenge.refresh')}<RefreshCw size={17} /></button>
      {passport.passages?.length > 0 && <div className="challenge-passages"><h2>{t('challenge.validated')}</h2><ul>{passport.passages.map((passage) => <li key={`${passage.occupant.id}-${passage.validatedAt}`}><Check size={16} /><span>{passage.occupant.name}</span></li>)}</ul></div>}
    </section>
  );
}
