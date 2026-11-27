import { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import { api } from '../lib/api';

const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

// Une affiche A5 par stand (nom, QR, consigne) et celle du comptoir des récompenses, prêtes à imprimer.
const posterHtml = (posters) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Affiches QR du Hub</title>
<style>
  @page { size: A5 portrait; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, sans-serif; color: #0f1822; }
  .poster { width: 148mm; height: 209mm; padding: 14mm 12mm; display: flex; flex-direction: column; align-items: center; justify-content: space-between; text-align: center; page-break-after: always; border-top: 6mm solid #156c53; }
  .kicker { margin: 0; color: #156c53; font-size: 14pt; font-weight: 700; }
  h1 { margin: 4mm 0 0; font-size: 26pt; line-height: 1.1; }
  .place { margin: 2mm 0 0; color: #555; font-size: 12pt; }
  img { width: 96mm; height: 96mm; }
  .call { margin: 0; padding: 4mm 6mm; border-radius: 3mm; color: #0f1822; background: #ffcf15; font-size: 15pt; font-weight: 800; line-height: 1.3; }
  .desk { border-top-color: #d31b34; }
</style></head><body>
${posters.map((poster) => `<section class="poster${poster.desk ? ' desk' : ''}">
  <div><p class="kicker">Hub de l’investissement · FIL 2026</p><h1>${escape(poster.title)}</h1>${poster.place ? `<p class="place">${escape(poster.place)}</p>` : ''}</div>
  <img src="${poster.image}" alt="">
  <p class="call">${escape(poster.call)}</p>
</section>`).join('')}
<script>window.onload = () => { window.print(); };</script>
</body></html>`;

// Paramètres → affiches QR : posées devant chaque stand, elles remplacent le scan par l'occupant (le visiteur valide
// son passage en deux questions, ou prend contact). Le QR du comptoir sert à récupérer la récompense au Stand API-ZF.
export default function PassageQrSettings({ token }) {
  const [posters, setPosters] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([api.passageQrCodes(token), import('qrcode')])
      .then(async ([data, { default: QRCode }]) => {
        const image = (url) => QRCode.toDataURL(url, { width: 600, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0f1822', light: '#ffffff' } });
        const list = await Promise.all([
          ...data.stands.map(async (stand) => ({ id: stand.id, title: stand.name, place: stand.standLabel, url: stand.url, image: await image(stand.url), call: 'Scannez : validez votre passage du Défi ou prenez contact avec nous' })),
          image(data.desk.url).then((qr) => ({ id: 'desk', desk: true, title: 'Récupérez votre récompense', place: 'Comptoir du Stand API-ZF', url: data.desk.url, image: qr, call: 'Vos 4 stands trouvés ? Touchez « Récupérer » et scannez ce QR' })),
        ]);
        if (active) setPosters(list);
      })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [token]);

  const print = () => {
    const page = window.open('', '_blank');
    if (!page) return;
    page.document.write(posterHtml(posters));
    page.document.close();
  };

  return (
    <section className="data-panel settings-panel">
      <h2>Affiches QR des stands</h2>
      <p className="settings-note">Une affiche devant chaque stand (passage du Défi et prise de contact), la dernière au comptoir du Stand API-ZF (récompenses).</p>
      {error && <p className="admin-form-error">{error}</p>}
      {!posters && !error && <p className="settings-note">Préparation des QR…</p>}
      {posters && (
        <>
          <ul className="qr-poster-grid">
            {posters.map((poster) => (
              <li key={poster.id} className={poster.desk ? 'is-desk' : ''}>
                <img src={poster.image} alt={`QR ${poster.title}`} />
                <strong>{poster.title}</strong>
              </li>
            ))}
          </ul>
          <button className="button button-primary" type="button" onClick={print}><Printer size={16} /> Imprimer les affiches</button>
        </>
      )}
    </section>
  );
}
