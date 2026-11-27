import { useMemo } from 'react';

const COLORS = ['#156c53', '#ffcf15', '#d31b34', '#005b3f', '#ffffff'];
const PIECES = 34;

// Salve de confettis aux couleurs de la charte, lancée depuis le centre de la roue quand on gagne. Purement décoratif,
// joué une fois (CSS) puis invisible ; rien ne s'affiche si l'appareil demande moins d'animations.
export default function Confetti() {
  const pieces = useMemo(() => Array.from({ length: PIECES }, (_value, index) => {
    const angle = (index / PIECES) * Math.PI * 2 + Math.random() * 0.4;
    const distance = 90 + Math.random() * 90;
    return {
      '--x': `${Math.cos(angle) * distance}px`,
      '--y': `${Math.sin(angle) * distance - 40}px`,
      '--r': `${Math.round(Math.random() * 720 - 360)}deg`,
      '--d': `${Math.round(Math.random() * 120)}ms`,
      background: COLORS[index % COLORS.length],
      width: index % 3 ? 7 : 5,
      height: index % 3 ? 11 : 5,
      borderRadius: index % 3 ? 1 : '50%',
    };
  }), []);
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((style, index) => <span key={index} style={style} />)}
    </div>
  );
}
