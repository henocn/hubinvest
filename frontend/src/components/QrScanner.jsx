import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PublicDialog from './PublicDialog';

// Chemins des QR du Hub : l'affiche d'un stand et le comptoir des récompenses.
const HUB_PATH = /^\/(passage\/[a-z0-9-]+\/[A-Za-z0-9_-]+|recuperer\/[A-Za-z0-9_-]+)\/?$/;

// Lit un QR du Hub avec l'appareil photo, sans quitter l'application (le joueur reste identifié). Rend le chemin lu.
// Si l'appareil photo est refusé ou absent, le joueur peut toujours scanner l'affiche avec l'appareil photo du
// téléphone ; `footer` propose en plus la solution de secours (montrer son code à l'équipe).
export default function QrScanner({ title, intro, onResult, onClose, footer }) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const [state, setState] = useState('starting');
  const [wrongCode, setWrongCode] = useState(false);

  useEffect(() => {
    let stream = null;
    let frame = 0;
    let active = true;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });

    const start = async () => {
      try {
        const [{ default: jsQR }, media] = await Promise.all([
          import('jsqr'),
          navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }),
        ]);
        stream = media;
        if (!active) return;
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        setState('scanning');
        let last = 0;
        const scan = (now) => {
          if (!active) return;
          frame = window.requestAnimationFrame(scan);
          if (now - last < 160 || video.readyState < 2) return;
          last = now;
          const width = Math.min(video.videoWidth, 640);
          const height = Math.round((video.videoHeight / video.videoWidth) * width);
          canvas.width = width;
          canvas.height = height;
          context.drawImage(video, 0, 0, width, height);
          const code = jsQR(context.getImageData(0, 0, width, height).data, width, height, { inversionAttempts: 'dontInvert' });
          if (!code?.data) return;
          let path = '';
          try { path = new URL(code.data, window.location.origin).pathname; } catch { path = ''; }
          if (HUB_PATH.test(path)) {
            active = false;
            navigator.vibrate?.(40);
            onResult(path.replace(/\/$/, ''));
          } else {
            setWrongCode(true);
          }
        };
        frame = window.requestAnimationFrame(scan);
      } catch {
        if (active) setState('denied');
      }
    };
    start();

    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onResult]);

  return (
    <PublicDialog title={title} intro={intro} onClose={onClose} className="qr-scanner-dialog">
      {state === 'denied' ? (
        <p className="public-message">{t('scanner.denied')}</p>
      ) : (
        <div className={`qr-scanner is-${state}`}>
          <video ref={videoRef} muted playsInline aria-label={t('scanner.camera')} />
          <span className="qr-scanner-frame" aria-hidden="true" />
          {state === 'starting' && <p className="qr-scanner-status">{t('scanner.starting')}</p>}
        </div>
      )}
      {wrongCode && <p className="form-error qr-scanner-wrong" role="alert">{t('scanner.wrong')}</p>}
      {footer}
    </PublicDialog>
  );
}
