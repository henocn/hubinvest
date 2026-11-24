import { Check } from 'lucide-react';

// Petite roue décorative (sans texte) : elle dépasse dans le coin de la pastille de la roue.
function DecoWheel() {
  const slices = 8;
  const colors = ['#156c53', '#ffffff', '#ffcf15', '#ffffff', '#156c53', '#ffffff', '#d31b34', '#ffffff'];
  const path = (index) => {
    const a0 = (index * 2 * Math.PI) / slices;
    const a1 = ((index + 1) * 2 * Math.PI) / slices;
    return `M50,50 L${50 + 48 * Math.cos(a0)},${50 + 48 * Math.sin(a0)} A48,48 0 0 1 ${50 + 48 * Math.cos(a1)},${50 + 48 * Math.sin(a1)} Z`;
  };
  return (
    <svg className="play-deco-wheel" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="49.5" fill="#0f1822" />
      {colors.map((color, index) => <path key={index} d={path(index)} fill={color} />)}
      <circle cx="50" cy="50" r="9" fill="#0f1822" />
      <circle cx="50" cy="50" r="4" fill="#ffcf15" />
    </svg>
  );
}

// Tampons du passeport : un par étape, remplis au fur et à mesure.
function Stamps({ done, total }) {
  return (
    <span className="play-stamps" aria-hidden="true">
      {Array.from({ length: total }, (_, index) => <i key={index} className={index < done ? 'is-done' : ''}>{index < done && <Check size={12} strokeWidth={3} />}</i>)}
    </span>
  );
}

// Pastille d'un jeu, réduite au minimum : un visuel parlant (tampons du passeport, petite roue), le titre, l'avancement
// du Défi (X / Y) et l'action. Comment jouer : la fenêtre « Règles du jeu ».
export default function PlayCard({ tone, title, progress, progressLabel, action }) {
  return (
    <article className={`play-game is-${tone}`}>
      {tone === 'wheel' && <DecoWheel />}
      {progress && <Stamps done={progress.done} total={progress.total} />}
      <h2>{title}</h2>
      {progress?.shown && <strong className="play-progress" aria-label={progressLabel}>{progress.done} / {progress.total}</strong>}
      {action}
    </article>
  );
}
