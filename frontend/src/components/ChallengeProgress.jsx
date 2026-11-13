import { Check, Gift } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Avancement du parcours des stands : barre de progression, étape finale et stands traversés.
export default function ChallengeProgress({ passport }) {
  const { t } = useTranslation();
  const completed = passport.status === 'completed' || passport.status === 'redeemed';
  const progress = Math.min(100, (passport.passageCount / passport.requiredPassages) * 100);

  return (
    <div className={`challenge-progress-block is-${passport.status}`}>
      <div className="challenge-progress" aria-label={t('challenge.progress', { count: passport.passageCount, total: passport.requiredPassages })}><i style={{ width: `${progress}%` }} /></div>
      {completed && <p className="challenge-next-step"><Gift size={19} />{t(`challenge.${passport.status}`)}</p>}
      {passport.passages?.length > 0 && <ul className="challenge-passages">{passport.passages.map((passage) => <li key={`${passage.occupant.id}-${passage.validatedAt}`}><Check size={16} /><span>{passage.occupant.name}</span></li>)}</ul>}
    </div>
  );
}
