import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import ChallengeCameraScanner from './ChallengeCameraScanner';

export default function ChallengeScannerDialog({ onCode, onClose }) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="challenge-scan-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="challenge-scan-dialog" role="dialog" aria-modal="true" aria-labelledby="challenge-scan-title" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <h2 id="challenge-scan-title">Scanner un QR code</h2>
          <button ref={closeButtonRef} className="challenge-scan-close" type="button" onClick={onClose} aria-label="Fermer"><X size={20} /></button>
        </header>
        <ChallengeCameraScanner onCode={onCode} />
      </section>
    </div>
  );
}
