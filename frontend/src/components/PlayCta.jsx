import { UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Bouton central, au-dessus de la navigation basse, qui ouvre l'identification du joueur.
export default function PlayCta({ onClick }) {
  const { t } = useTranslation();
  return (
    <div className="play-cta">
      <button className="button button-primary button-large" type="button" onClick={onClick}><UserRound size={19} />{t('play.identify')}</button>
    </div>
  );
}
