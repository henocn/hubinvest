import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../lib/api';

const dateTime = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const fullName = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(' ');

// Liste des joueurs scannés sur le stand : le plus récent d'abord, avec l'heure et la personne qui a scanné.
export default function ScanListDialog({ session, onLogout, onClose }) {
  const closeButtonRef = useRef(null);
  const [scans, setScans] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    closeButtonRef.current?.focus();
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    let active = true;
    // Pour un occupant, l'API ne renvoie que les joueurs passés par son stand, avec ses seuls passages.
    api.challengePassports(session.token)
      .then((passports) => {
        if (!active) return;
        const rows = passports.flatMap((passport) => (passport.passages || []).map((passage) => ({
          id: passage.id,
          player: passport.displayName,
          at: passage.createdAt,
          by: fullName(passage.validatedBy),
        })));
        setScans(rows.sort((a, b) => new Date(b.at) - new Date(a.at)));
      })
      .catch((requestError) => {
        if (!active) return;
        if (requestError.status === 401 || requestError.status === 403) onLogout();
        else setError(requestError.message);
      });
    return () => { active = false; };
  }, [onLogout, session.token]);

  return (
    <div className="challenge-scan-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="challenge-scan-dialog scan-list-dialog" role="dialog" aria-modal="true" aria-labelledby="scan-list-title" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <h2 id="scan-list-title">Liste des scans{scans?.length > 0 && <span> · {scans.length}</span>}</h2>
          <button ref={closeButtonRef} className="challenge-scan-close" type="button" onClick={onClose} aria-label="Fermer"><X size={20} /></button>
        </header>
        {error && <p className="panel-error" role="alert">{error}</p>}
        {!error && !scans && <p className="scan-list-empty">Chargement…</p>}
        {scans?.length === 0 && <p className="scan-list-empty">Aucun joueur scanné pour le moment.</p>}
        {scans?.length > 0 && (
          <ul className="scan-list">
            {scans.map((scan) => (
              <li key={scan.id}>
                <strong>{scan.player}</strong>
                <span>{dateTime.format(new Date(scan.at))}{scan.by && ` · ${scan.by}`}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
