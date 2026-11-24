import { Disc3, Route } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PublicDialog from './PublicDialog';

// Règles des deux jeux, ouvertes depuis « Règles du jeu » : les pastilles de la page restent visuelles.
export default function GameRulesDialog({ onClose }) {
  const { t } = useTranslation();
  const games = [
    { key: 'route', Icon: Route, title: t('play.routeTitle'), steps: [1, 2, 3, 4].map((step) => t(`rules.route${step}`)) },
    { key: 'wheel', Icon: Disc3, title: t('wheel.title'), steps: [1, 2, 3, 4].map((step) => t(`rules.wheel${step}`)) },
  ];
  return (
    <PublicDialog title={t('rules.title')} onClose={onClose} className="rules-dialog">
      {games.map(({ key, Icon, title, steps }) => (
        <section key={key} className={`rules-game is-${key}`}>
          <h3><span aria-hidden="true"><Icon size={18} /></span>{title}</h3>
          <ol>{steps.map((step) => <li key={step}>{step}</li>)}</ol>
        </section>
      ))}
      <p className="rules-note">{t('rules.note')}</p>
    </PublicDialog>
  );
}
