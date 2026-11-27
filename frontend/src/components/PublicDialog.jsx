import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

// Fenêtre modale des pages publiques : fond assombri, titre, fermeture par la croix, Échap ou clic à côté.
// Rendue directement dans <body> : ouverte depuis le bandeau d'accueil, elle passait sous le programme du jour
// (le bloc rouge « En ce moment » recouvrait le formulaire), le bandeau formant sa propre couche d'affichage.
export default function PublicDialog({ title, intro, onClose, locked = false, className = '', children }) {
  const { t } = useTranslation();

  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === 'Escape' && !locked) onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      document.body.style.overflow = overflow;
    };
  }, [locked, onClose]);

  return createPortal(
    <div className="player-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !locked) onClose(); }}>
      <section className={`player-dialog ${className}`.trim()} role="dialog" aria-modal="true" aria-labelledby="public-dialog-title">
        <header>
          <div>
            <h2 id="public-dialog-title">{title}</h2>
            {intro && <p>{intro}</p>}
          </div>
          <button className="player-dialog-close" type="button" onClick={onClose} disabled={locked} aria-label={t('common.close')}><X size={20} /></button>
        </header>
        {children}
      </section>
    </div>,
    document.body,
  );
}
