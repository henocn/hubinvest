import { Check, Gift, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function ChallengePassportCard({ passport }) {
  const { t } = useTranslation();
  const [qrImage, setQrImage] = useState('');
  const completed = passport.status === 'completed' || passport.status === 'redeemed';
  const progress = Math.min(100, (passport.passageCount / passport.requiredPassages) * 100);

  useEffect(() => {
    let active = true;
    import('qrcode')
      .then(({ default: QRCode }) => QRCode.toDataURL(passport.code, {
        width: 256,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#000000', light: '#ffffff' },
      }))
      .then((image) => { if (active) setQrImage(image); })
      .catch(() => { if (active) setQrImage(''); });
    return () => { active = false; };
  }, [passport.code]);

  return (
    <section className={`challenge-passport-card is-${passport.status}`}>
      <header><span>{t('challenge.participant', { name: passport.displayName })}</span><strong>{passport.passageCount} / {passport.requiredPassages}</strong></header>
      <div className="challenge-progress" aria-label={t('challenge.progress', { count: passport.passageCount, total: passport.requiredPassages })}><i style={{ width: `${progress}%` }} /></div>
      <div className="challenge-code">
        {qrImage && <img className="challenge-qr" src={qrImage} alt={t('challenge.qrAlt', { code: passport.code })} />}
        <span>{t('challenge.code')}</span>
        <strong>{passport.code}</strong>
      </div>
      <p className="challenge-next-step">{completed ? <Gift size={19} /> : <MapPin size={19} />}{t(`challenge.${passport.status}`)}</p>
      {passport.passages?.length > 0 && <div className="challenge-passages"><h2>{t('challenge.validated')}</h2><ul>{passport.passages.map((passage) => <li key={`${passage.occupant.id}-${passage.validatedAt}`}><Check size={16} /><span>{passage.occupant.name}</span></li>)}</ul></div>}
    </section>
  );
}
