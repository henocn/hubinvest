import { Check, Gift } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const STEPS = [1, 2, 3, 4, 5];

// « Trouvez les 5 étapes » : une pastille par étape du parcours de l'investisseur. Les quatre premières se gagnent sur
// les stands de l'Espace Industrie (dans l'ordre des passages), la cinquième au Stand API-ZF.
export default function ChallengeProgress({ passport }) {
  const { t } = useTranslation();
  const completed = passport.status === 'completed' || passport.status === 'redeemed';
  const passages = passport.passages || [];
  const industry = passages.filter((passage) => passage.occupant?.space !== 'apizf');
  const apizf = passages.find((passage) => passage.occupant?.space === 'apizf');
  const stepPassage = (step) => (step === 5 ? apizf : industry[step - 1]);

  return (
    <div className={`challenge-progress-block is-${passport.status}`}>
      <ol className="challenge-steps" aria-label={t('challenge.progress', { count: passport.passageCount, total: passport.requiredPassages })}>
        {STEPS.map((step) => {
          const passage = stepPassage(step);
          return (
            <li key={step} className={passage ? 'is-found' : ''}>
              <span className="challenge-step-badge" aria-hidden="true">{passage ? <Check size={16} /> : step}</span>
              <span className="challenge-step-text">
                <strong>{t(`services.stages.${step}`)}</strong>
                <small>{passage ? passage.occupant.name : t(step === 5 ? 'challenge.atApizf' : 'challenge.atIndustry')}</small>
              </span>
            </li>
          );
        })}
      </ol>
      {completed && <p className="challenge-next-step"><Gift size={19} />{t(`challenge.${passport.status}`)}</p>}
    </div>
  );
}
