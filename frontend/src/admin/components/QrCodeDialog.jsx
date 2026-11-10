import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import QRCode from 'qrcode';

export default function QrCodeDialog({ title, url, fileName, onClose }) {
  const [image, setImage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(url, {
      width: 720,
      margin: 3,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then((value) => active && setImage(value))
      .catch(() => active && setError('Le QR code ne peut pas être généré.'));

    return () => { active = false; };
  }, [url]);

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="qr-dialog" role="dialog" aria-modal="true" aria-labelledby="qr-title" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <h2 id="qr-title">{title}</h2>
          <button className="admin-icon-button" type="button" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </header>
        {image && <img src={image} alt={`QR code vers ${url}`} />}
        {error && <p className="admin-form-error">{error}</p>}
        <span className="qr-address">{url}</span>
        <footer>
          <button className="button button-secondary" type="button" onClick={onClose}>Fermer</button>
          {image && <a className="button button-primary" href={image} download={`${fileName}.png`}><Download size={17} /> Télécharger</a>}
        </footer>
      </section>
    </div>
  );
}
