import { useEffect, useMemo, useState } from 'react';
import { MapPin, Mic } from 'lucide-react';
import { api, resolveAssetUrl } from '../lib/api';
import { services } from '../content/services';
import hubLogoWhite from '../assets/brand/hub-logo-white.png';

const TIME_ZONE = 'Africa/Lome';
const REFRESH = 30_000;
const formats = {
  day: new Intl.DateTimeFormat('fr-FR', { timeZone: TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long' }),
  time: new Intl.DateTimeFormat('fr-FR', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' }),
};
const COUNTERS = [
  ['players', 'Joueurs des Défis'],
  ['guichetMeetings', 'Rendez-vous aux guichets'],
  ['b2bMeetings', 'Rencontres B2B tenues'],
  ['capsules', 'Capsules livrées'],
];

// QR d'une capsule, pour la regarder sur son téléphone.
function CapsuleQr({ url }) {
  const [image, setImage] = useState('');
  useEffect(() => {
    let active = true;
    import('qrcode')
      .then(({ default: QRCode }) => QRCode.toDataURL(url, { margin: 1, width: 160, color: { dark: '#0f1822', light: '#ffffff' } }))
      .then((data) => { if (active) setImage(data); })
      .catch(() => {});
    return () => { active = false; };
  }, [url]);
  return image ? <img className="screen-qr" src={image} alt="" /> : <span className="screen-qr" />;
}

// Grand écran du Stand API-ZF (document v4, M7) : le service du jour, l'entreprise à la une, la prochaine interview,
// les compteurs mesurés et les dernières capsules. Se rafraîchit seul ; en mode repli, une boucle vidéo plein écran.
export default function ScreenPage() {
  const [data, setData] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    const load = () => api.screen().then((result) => { if (active) setData(result); }).catch(() => {});
    load();
    const refresh = window.setInterval(load, REFRESH);
    const clock = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => {
      active = false;
      window.clearInterval(refresh);
      window.clearInterval(clock);
    };
  }, []);

  const service = useMemo(() => services.find((item) => item.key === data?.service), [data?.service]);

  if (data?.mode === 'video') {
    return <main className="screen is-video"><video src={data.videoUrl} autoPlay muted loop playsInline /></main>;
  }

  const spotlight = data?.spotlight?.occupant;
  const interview = data?.nextInterview;

  return (
    <main className="screen">
      <header className="screen-top">
        <img src={hubLogoWhite} alt="Hub de l’investissement" />
        <span className="screen-date">{formats.day.format(new Date(now))}</span>
        <strong className="screen-clock">{formats.time.format(new Date(now))}</strong>
      </header>

      <section className="screen-service">
        <span className="screen-label">Le service du jour</span>
        {service && (
          <>
            <h1>{service.fr.title}</h1>
            <p>{service.fr.promise}</p>
            <span className="screen-place"><MapPin aria-hidden="true" />{service.fr.place}</span>
          </>
        )}
      </section>

      <aside className="screen-side">
        <section className="screen-block">
          <span className="screen-label">L’entreprise à la une</span>
          {spotlight ? (
            <div className="screen-company">
              {(spotlight.logoUrl || spotlight.coverImageUrl) && <img src={resolveAssetUrl(spotlight.logoUrl || spotlight.coverImageUrl)} alt="" />}
              <span><strong>{spotlight.name}</strong>{(data.spotlight.location || spotlight.standLabel) && <small>{data.spotlight.location || spotlight.standLabel}</small>}</span>
            </div>
          ) : <p className="screen-empty">Programmée chaque jour dans l’Espace Industrie.</p>}
        </section>
        <section className="screen-block">
          <span className="screen-label">Prochaine interview</span>
          {interview ? (
            <div className="screen-interview">
              <Mic aria-hidden="true" />
              <span><strong>{formats.time.format(new Date(interview.startsAt))}</strong><small>{interview.title}</small></span>
            </div>
          ) : <p className="screen-empty">Le programme du Studio sera bientôt affiché.</p>}
        </section>
      </aside>

      <section className="screen-counters" aria-label="Chiffres du Hub">
        {COUNTERS.map(([key, label]) => (
          <div key={key}><strong>{data?.counters?.[key] ?? '—'}</strong><span>{label}</span></div>
        ))}
      </section>

      <section className="screen-capsules">
        <span className="screen-label">Dernières capsules</span>
        {data?.capsules?.length ? (
          <ul>
            {data.capsules.map((capsule) => (
              <li key={capsule.id}>
                <CapsuleQr url={capsule.url} />
                <span><strong>{capsule.guestName}</strong><small>{[capsule.format, capsule.organization].filter(Boolean).join(' · ')}</small></span>
              </li>
            ))}
          </ul>
        ) : <p className="screen-empty">Les premières capsules du Studio arrivent.</p>}
      </section>

      <span className="screen-band" aria-hidden="true" />
    </main>
  );
}
