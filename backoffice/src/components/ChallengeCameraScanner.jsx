import { useEffect, useRef, useState } from 'react';

const participantCode = /^(?:[A-HJ-NP-Z2-9]{6}|[A-HJ-NP-Z2-9]{8})$/;

// Caméra arrière en bonne définition d'abord (les petits QR se lisent mieux, surtout sur iPhone),
// puis n'importe quelle caméra si l'appareil refuse ces réglages.
const CAMERA_CONSTRAINTS = [
  { audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
  { audio: false, video: { facingMode: { ideal: 'environment' } } },
  { audio: false, video: true },
];
// Erreurs qui méritent un autre essai avec des réglages plus simples (un refus de l'utilisateur, non).
const RETRYABLE = new Set(['OverconstrainedError', 'ConstraintNotSatisfiedError', 'NotReadableError', 'AbortError', 'NotFoundError']);

export default function ChallengeCameraScanner({ onCode }) {
  const videoRef = useRef(null);
  const [error, setError] = useState('');
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    let stopped = false;
    let controls;
    let detected = false;

    if (!navigator.mediaDevices?.getUserMedia) {
      setUnavailable(true);
      setError('Caméra indisponible. Saisissez le code sur la page.');
      return undefined;
    }

    // Safari (iPhone) ne lit la vidéo dans la page que si elle est muette et « inline », posé avant le flux.
    video.muted = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('autoplay', '');

    const onResult = (result, _scanError, scanControls) => {
      if (!result || stopped || detected) return;
      const code = result.getText().trim().toUpperCase();
      if (!participantCode.test(code)) {
        setError('Ce QR ne contient pas un code participant.');
        return;
      }
      detected = true;
      scanControls.stop();
      onCode(code);
    };

    import('@zxing/browser')
      .then(async ({ BrowserQRCodeReader }) => {
        const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 250 });
        let lastError;
        for (const constraints of CAMERA_CONSTRAINTS) {
          if (stopped) return;
          try {
            const activeControls = await reader.decodeFromConstraints(constraints, video, onResult);
            if (stopped) activeControls.stop();
            else controls = activeControls;
            return;
          } catch (cameraError) {
            lastError = cameraError;
            if (!RETRYABLE.has(cameraError?.name)) break;
          }
        }
        throw lastError;
      })
      .catch((cameraError) => {
        if (stopped) return;
        setUnavailable(true);
        setError(cameraError?.name === 'NotAllowedError'
          ? 'Caméra refusée. Autorisez-la dans les réglages du navigateur, ou saisissez le code sur la page.'
          : 'Caméra indisponible. Saisissez le code sur la page.');
      });

    return () => {
      stopped = true;
      controls?.stop();
      video?.srcObject?.getTracks?.().forEach((track) => track.stop());
      if (video) video.srcObject = null;
    };
  }, [onCode]);

  return (
    <div className="challenge-camera-view">
      <video ref={videoRef} className={unavailable ? 'is-unavailable' : ''} autoPlay muted playsInline aria-label="Caméra de scan du QR code" />
      {error && <p role="status">{error}</p>}
    </div>
  );
}
