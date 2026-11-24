import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../admin/lib/api';

const dateTime = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// Liste des joueurs scannés sur le stand : le nom et l'heure du scan, le plus récent d'abord.
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
        // Le Stand API-ZF reçoit tous les joueurs (remise des récompenses) : on ne garde que les passages de ce stand.
        const standId = session.user.occupant?.id || session.user.occupantId;
        const own = (passage) => !standId || (passage.occupant?.id || passage.occupantId) === standId;
        const rows = passports.flatMap((passport) => (passport.passages || []).filter(own).map((passage) => ({
          id: passage.id,
          player: passport.displayName,
          at: passage.createdAt,
        })));
        setScans(rows.sort((a, b) => new Date(b.at) - new Date(a.at)));
      })
      .catch((requestError) => {
        if (!active) return;
        if (requestError.status === 401) onLogout();
        else setError(requestError.message);
      });
    return () => { active = false; };
  }, [onLogout, session.token, session.user.occupant?.id, session.user.occupantId]);

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
                <span>{dateTime.format(new Date(scan.at))}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
