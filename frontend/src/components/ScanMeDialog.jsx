import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PublicDialog from './PublicDialog';

// Affiche le QR et le code participant à faire scanner par l'équipe du stand.
export default function ScanMeDialog({ passport, onClose }) {
  const { t } = useTranslation();
  const [qrImage, setQrImage] = useState('');

  useEffect(() => {
    let active = true;
    import('qrcode')
      .then(({ default: QRCode }) => QRCode.toDataURL(passport.code, {
        width: 320,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: '#0f1822', light: '#ffffff' },
      }))
      .then((image) => { if (active) setQrImage(image); })
      .catch(() => { if (active) setQrImage(''); });
    return () => { active = false; };
  }, [passport.code]);

  return (
    <PublicDialog title={t('scan.title')} intro={t('scan.intro')} onClose={onClose} className="scan-dialog">
      <div className="scan-code">
        <div className="scan-qr-frame">{qrImage && <img className="scan-qr" src={qrImage} alt={t('challenge.qrAlt', { code: passport.code })} />}</div>
        <span>{t('challenge.code')}</span>
        <strong>{passport.code}</strong>
      </div>
    </PublicDialog>
  );
}
