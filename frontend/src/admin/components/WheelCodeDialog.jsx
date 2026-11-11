import { X } from 'lucide-react';

const timeFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', hour: '2-digit', minute: '2-digit' });

// Affiche en grand le code à dicter ou à montrer au joueur.
export default function WheelCodeDialog({ wheelCode, loading, error, onNew, onClose }) {
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="qr-dialog wheel-code-dialog" role="dialog" aria-modal="true" aria-labelledby="wheel-code-title" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <h2 id="wheel-code-title">Code de jeu</h2>
          <button className="admin-icon-button" type="button" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </header>
        {wheelCode && <strong className="wheel-code-value">{wheelCode.code}</strong>}
        {wheelCode && <p className="wheel-code-hint">Une seule partie, jusqu’à {timeFormatter.format(new Date(wheelCode.expiresAt))}.</p>}
        {error && <p className="admin-form-error">{error}</p>}
        <footer>
          <button className="button button-secondary" type="button" onClick={onClose}>Fermer</button>
          <button className="button button-primary" type="button" onClick={onNew} disabled={loading}>{loading ? 'Création...' : 'Nouveau code'}</button>
        </footer>
      </section>
    </div>
  );
}
