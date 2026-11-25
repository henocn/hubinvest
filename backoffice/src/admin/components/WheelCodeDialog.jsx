import { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

const spinsLabel = (count) => `${count} tour${count > 1 ? 's' : ''}`;

// Fenêtre « Code de jeu » : le dernier code créé en grand, à dicter ou montrer au joueur. Les codes déjà délivrés restent
// repliés (« Codes délivrés ») pour que le joueur devant l'écran ne les voie pas.
// Fond vert : le code a gagné un lot ; rouge : joué sans lot ; sans fond : pas encore joué. Un code n'expire pas.
export default function WheelCodeDialog({ codes, created, loading, error, onNew, onClose }) {
  const [showCodes, setShowCodes] = useState(false);
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="qr-dialog wheel-code-dialog" role="dialog" aria-modal="true" aria-labelledby="wheel-code-title" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <h2 id="wheel-code-title">Code de jeu</h2>
          <button className="admin-icon-button" type="button" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </header>
        {created && <strong className="wheel-code-value">{created.code}</strong>}
        {created && <p className="wheel-code-hint">{spinsLabel(created.spinsAllowed)} avec ce code, sans limite de temps.</p>}
        {error && <p className="admin-form-error">{error}</p>}
        <button className="button button-primary wheel-code-new" type="button" onClick={onNew} disabled={loading}>{loading ? 'Création…' : 'Nouveau code'}</button>
        {codes.length > 0 && (
          <button className={`wheel-code-toggle${showCodes ? ' is-open' : ''}`} type="button" onClick={() => setShowCodes((value) => !value)} aria-expanded={showCodes}>
            Codes délivrés ({codes.length})<ChevronDown size={16} aria-hidden="true" />
          </button>
        )}
        {codes.length > 0 && showCodes && (
          <>
            <ul className="wheel-code-grid" aria-label="Codes délivrés">
              {codes.map((item) => (
                <li key={item.id} className={item.outcome ? `is-${item.outcome}` : ''} title={item.outcome === 'won' ? 'Gagnant' : item.outcome === 'lost' ? 'Perdant' : 'Pas encore joué'}>
                  {item.code}
                  {item.spinsAllowed > 1 && <small>{item.spinsUsed}/{item.spinsAllowed}</small>}
                </li>
              ))}
            </ul>
            <p className="wheel-code-legend"><span className="is-won" /> Gagnant <span className="is-lost" /> Perdant <span /> Pas encore joué</p>
          </>
        )}
      </section>
    </div>
  );
}
