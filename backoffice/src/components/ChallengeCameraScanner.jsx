import { useEffect, useRef, useState } from 'react';

const participantCode = /^(?:[A-HJ-NP-Z2-9]{6}|[A-HJ-NP-Z2-9]{8})$/;

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

    import('@zxing/browser')
      .then(async ({ BrowserQRCodeReader }) => {
        if (stopped) return;
        const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 300 });
        const activeControls = await reader.decodeFromConstraints(
          { audio: false, video: { facingMode: { ideal: 'environment' } } },
          video,
          (result, _scanError, scanControls) => {
            if (!result || stopped || detected) return;
            const code = result.getText().trim().toUpperCase();
            if (!participantCode.test(code)) {
              setError('Ce QR ne contient pas un code participant.');
              return;
            }
            detected = true;
            scanControls.stop();
            onCode(code);
          },
        );
        if (stopped) activeControls.stop();
        else controls = activeControls;
      })
      .catch((cameraError) => {
        if (stopped) return;
        setUnavailable(true);
        setError(cameraError.name === 'NotAllowedError'
          ? 'Caméra refusée. Saisissez le code sur la page.'
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
