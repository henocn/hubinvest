import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Mic } from 'lucide-react';
import { api, resolveAssetUrl } from '../lib/api';
import { videoSource } from '../lib/video-source';
import { services } from '../content/services';
import hubLogoWhite from '../assets/brand/hub-logo-white.png';
import hubSymbolWhite from '../assets/brand/hub-symbol-white.png';
import apizfLogo from '../assets/brand/apizf-logo.png';
import apizfFilm from '../assets/brand/apizf-logo-animation.mp4';
import '../screen.css';

// Grand écran du Stand API-ZF (65 pouces, 16:9) : un film de marque qui tourne en boucle, pas une page web.
// Contenu fixé par le document v4 (M7) : le service du jour, l'entreprise à la une, la prochaine interview, les
// compteurs mesurés, les dernières capsules ; QR codes vers les rendez-vous, la fiche de l'entreprise et le site.
// S'y ajoutent l'ouverture, les stands du Hub et la signature de l'API-ZF.
// - Un seul trait jaune ne quitte jamais l'écran : il glisse d'une scène à l'autre et devient tour à tour le filet
//   d'un titre, le repère d'une liste, la ligne de base des chiffres.
// - Les titres montent mot par mot derrière une ligne de masque ; le reste arrive en fondu doux.
// - L'image respire en continu, le grain change sans cesse, les bords sont légèrement assombris.
// Les scènes sans donnée sont sautées. En mode repli (Paramètres), une boucle vidéo plein écran.

const TIME_ZONE = 'Africa/Lome';
const REFRESH = 30_000;
const SITE_URL = 'https://hub.investir.tg';
const LEAVE = 900; // durée du fondu de sortie d'une scène
const formats = {
  day: new Intl.DateTimeFormat('fr-FR', { timeZone: TIME_ZONE, weekday: 'long', day: 'numeric' }),
  time: new Intl.DateTimeFormat('fr-FR', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' }),
};
const COUNTERS = [
  ['players', 'Joueurs des Défis'],
  ['guichetMeetings', 'Rendez-vous aux guichets'],
  ['b2bMeetings', 'Rencontres B2B tenues'],
  ['capsules', 'Capsules livrées'],
];
const STAND_SLOT = 300; // place d'un logo sur le tapis (voir .s-belt-track li)
const STANDS_START = 1700; // le premier logo tombe (millisecondes après l'arrivée de la scène)
const STANDS_STEP = 1250; // un logo tombe, se pose, le tapis avance d'une place : puis le suivant
const CLOSING_SECONDS = 9; // le film du logo API-ZF (6,9 s), puis sa dernière image tenue

// Délai d'entrée d'un élément, en secondes après l'arrivée de la scène.
const at = (delay) => ({ '--d': `${delay}s` });

// ——— Le trait jaune : chaque scène lui indique où se poser, il y glisse depuis sa place précédente ———

const ThreadContext = createContext(() => {});

// Emplacement invisible que le trait vient occuper. `watch` : valeur dont le changement déplace l'emplacement.
function Anchor({ active = true, className = '', watch }) {
  const ref = useRef(null);
  const place = useContext(ThreadContext);
  useLayoutEffect(() => { if (active) place(ref.current); }, [active, place, watch]);
  return <span ref={ref} className={`s-anchor ${className}`} aria-hidden="true" />;
}

// Compte de 0 à `count`, un pas par période, après un délai : rythme d'une suite d'éléments qui arrivent un par un.
function useSteps(count, period, delay) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    let tick;
    const timer = window.setTimeout(() => {
      setStep(1);
      tick = window.setInterval(() => setStep((value) => value + 1), period);
    }, delay);
    return () => { window.clearTimeout(timer); window.clearInterval(tick); };
  }, [period, delay]);
  return Math.min(step, count);
}

// Vrai une fois le délai écoulé : sert à faire passer le trait d'un emplacement à un autre dans une même scène.
function useAfter(delay) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setDone(true), delay);
    return () => window.clearTimeout(timer);
  }, [delay]);
  return done;
}

// ——— Éléments animés ———

// Élément qui arrive en fondu doux (légère montée, flou qui se dissipe).
function In({ as: Tag = 'span', delay = 0, className = '', children }) {
  return <Tag className={`m-in ${className}`} style={at(delay)}>{children}</Tag>;
}

// Titre dont les mots montent un par un derrière une ligne de masque.
function Words({ as: Tag = 'span', delay = 0, className = '', children }) {
  const words = String(children).split(' ');
  return (
    <Tag className={`m-words ${className}`} aria-label={children}>
      {words.map((word, index) => (
        <span key={index} aria-hidden="true">
          <span className="m-word"><span style={at(delay + index * 0.09)}>{word}</span></span>{index < words.length - 1 && ' '}
        </span>
      ))}
    </Tag>
  );
}

// Titre de scène : le trait jaune vient se poser au-dessus, puis le titre monte.
function Head({ title, sub, thread = true }) {
  return (
    <header className="s-head">
      <Anchor className="is-rule" active={thread} />
      <Words as="h2" delay={0.4}>{title}</Words>
      {sub && <In as="p" className="s-head-sub" delay={0.8}>{sub}</In>}
    </header>
  );
}

// Nombre qui se compte de 0 à sa valeur, une fois la scène arrivée.
function CountUp({ value, delay = 0, duration = 2200 }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let tick;
    const target = Number(value) || 0;
    const timer = window.setTimeout(() => {
      const start = Date.now();
      tick = window.setInterval(() => {
        const progress = Math.min(1, (Date.now() - start) / duration);
        setShown(Math.round(target * (1 - (1 - progress) ** 4)));
        if (progress === 1) window.clearInterval(tick);
      }, 33);
    }, delay * 1000);
    return () => { window.clearTimeout(timer); window.clearInterval(tick); };
  }, [value, delay, duration]);
  return <>{shown.toLocaleString('fr-FR')}</>;
}

function Qr({ url, size = 220 }) {
  const [image, setImage] = useState('');
  useEffect(() => {
    let active = true;
    import('qrcode')
      .then(({ default: QRCode }) => QRCode.toDataURL(url, { margin: 1, width: size * 2, color: { dark: '#0f1822', light: '#ffffff' } }))
      .then((data) => { if (active) setImage(data); })
      .catch(() => {});
    return () => { active = false; };
  }, [url, size]);
  return <span className="s-qr" style={{ width: size, height: size }}>{image && <img src={image} alt="" />}</span>;
}

// QR code d'une scène, avec ce qu'il permet de faire.
function Scan({ url, label, delay = 1.1 }) {
  return (
    <div className="s-scan m-in" style={at(delay)}>
      <Qr url={url} size={300} />
      <strong>{label}</strong>
    </div>
  );
}

// ——— Scènes ———

function OpenerScene() {
  return (
    <div className="s-scene s-opener">
      <img className="s-opener-symbol m-in" style={at(0.2)} src={hubSymbolWhite} alt="" />
      <h1 className="s-opener-word" aria-label="Investir">
        {'Investir'.split('').map((letter, index) => <span key={index} style={at(0.7 + index * 0.07)} aria-hidden="true">{letter}</span>)}
      </h1>
      <Anchor className="is-rule is-center" />
      <Words as="p" className="s-opener-sub" delay={1.9}>Hub de l’investissement</Words>
      <In as="p" className="s-opener-meta" delay={2.5}>Stand API-ZF · Foire internationale de Lomé 2026</In>
    </div>
  );
}

function ServiceScene({ service }) {
  return (
    <div className="s-scene s-service">
      <span className="s-service-stage m-in" style={at(0.1)} aria-hidden="true"><span>{service.stage}</span></span>
      <div className="s-service-body">
        <In className="s-kicker" delay={0.3}>Le service du jour · Étape {service.stage}</In>
        <Words as="h2" className="s-display" delay={0.5}>{service.fr.title}</Words>
        <Anchor className="is-rule is-spaced" />
        <In as="p" className="s-lead" delay={1.3}>{service.fr.promise}</In>
        <In as="p" className="s-place" delay={1.7}><MapPin aria-hidden="true" />{service.fr.place}</In>
      </div>
      <Scan url={`${SITE_URL}/guichets`} label="Prendre rendez-vous" delay={1.5} />
    </div>
  );
}

function CountersScene({ counters }) {
  const onLine = useAfter(1500); // le trait s'étire en ligne de base au-dessus des chiffres
  return (
    <div className="s-scene s-counters">
      <Head title="Le Hub en chiffres" thread={!onLine} />
      <Anchor className="is-line" active={onLine} />
      <ul className="s-counters-grid">
        {COUNTERS.map(([key, label], index) => (
          <li key={key} className="m-in" style={at(1.2 + index * 0.18)}>
            <strong><CountUp value={counters[key]} delay={1.4 + index * 0.18} /></strong>
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SpotlightScene({ spotlight }) {
  const { occupant } = spotlight;
  const image = occupant.logoUrl || occupant.coverImageUrl;
  const place = spotlight.location || occupant.standLabel;
  return (
    <div className="s-scene s-spotlight">
      {image && <div className="s-spotlight-card m-in" style={at(0.3)}><img src={resolveAssetUrl(image)} alt="" /></div>}
      <div className="s-spotlight-body">
        <In className="s-kicker" delay={0.5}>L’entreprise à la une</In>
        <Words as="h2" className="s-display" delay={0.7}>{occupant.name}</Words>
        <Anchor className="is-rule is-spaced" />
        {place && <In as="p" className="s-place" delay={1.4}><MapPin aria-hidden="true" />{place}</In>}
      </div>
      {occupant.slug && <Scan url={`${SITE_URL}/stands/${occupant.slug}`} label="Voir sa fiche" delay={1.6} />}
    </div>
  );
}

function InterviewScene({ interview }) {
  return (
    <div className="s-scene s-interview">
      <div>
        <In className="s-kicker" delay={0.3}>Prochaine interview au Studio</In>
        <In as="strong" className="s-interview-time" delay={0.5}>{formats.time.format(new Date(interview.startsAt))}</In>
        <Anchor className="is-rule is-spaced" />
        <In as="p" className="s-lead" delay={1.2}>{interview.title}</In>
      </div>
      <span className="s-interview-mic m-in" style={at(0.6)} aria-hidden="true"><Mic /><i /><i /><i /></span>
    </div>
  );
}

// Les stands, sur un tapis roulant. Un logo descend en biais et se pose sur la ligne ; le tapis avance d'une place ;
// le logo suivant tombe au même endroit, et ainsi de suite. Les premiers arrivés sortent par la gauche.
// Pas de fond : le logo seul, sur du blanc pour qu'un logo transparent reste lisible. Le trait jaune est le tapis.
function StandsScene({ stands }) {
  const landed = useSteps(stands.length, STANDS_STEP, STANDS_START);
  const onBelt = useAfter(1100); // le trait quitte le titre et s'étire : il devient la ligne du tapis
  return (
    <div className="s-scene s-stands">
      <Head title="Les stands du Hub" sub="Pavillon de l’Oti" thread={!onBelt} />
      <div className="s-belt">
        <ul className="s-belt-track" style={{ transform: `translateX(${-landed * STAND_SLOT}px)` }}>
          {stands.map((stand, index) => (
            <li key={stand.id} className={index < landed ? 'is-landed' : ''}>
              <span className="s-belt-logo">
                {stand.logoUrl ? <img src={resolveAssetUrl(stand.logoUrl)} alt="" /> : <b>{stand.name}</b>}
              </span>
              {stand.logoUrl && <span className="s-belt-name">{stand.name}</span>}
            </li>
          ))}
        </ul>
        <Anchor className="is-line" active={onBelt} />
      </div>
    </div>
  );
}

function CapsulesScene({ capsules }) {
  return (
    <div className="s-scene s-capsules">
      <Head title="Dernières capsules du Studio" />
      <ul className="s-capsules-row">
        {capsules.map((capsule, index) => (
          <li key={capsule.id} className="m-in" style={at(0.9 + index * 0.16)}>
            <Qr url={capsule.url} size={220} />
            <strong>{capsule.guestName}</strong>
            <span>{[capsule.format, capsule.organization].filter(Boolean).join(' · ')}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Fin de boucle : le film du logo de l'API-ZF, plein écran, sans son. Sa dernière image reste affichée.
// Si la vidéo ne se charge pas, le logo fixe est déjà là, dessous.
function ClosingScene() {
  return (
    <div className="s-scene s-closing">
      <div className="s-closing-film">
        <img src={apizfLogo} alt="API-ZF" />
        <video src={apizfFilm} autoPlay muted playsInline preload="auto" />
      </div>
    </div>
  );
}

// ——— Mise en scène ———

const OPENER = { key: 'opener', label: 'Hub de l’investissement', seconds: 8, render: () => <OpenerScene /> };

// Les scènes de la boucle, dans l'ordre, avec leur durée (secondes). Une scène sans donnée n'est pas jouée.
const buildScenes = (data) => {
  if (!data) return [OPENER];
  const service = services.find((item) => item.key === data.service);
  const counters = data.counters || {};
  const hasCounters = COUNTERS.some(([key]) => Number(counters[key]) > 0);
  const scenes = [
    OPENER,
    service && { key: 'service', label: 'Service du jour', seconds: 13, qr: true, render: () => <ServiceScene service={service} /> },
    data.spotlight?.occupant && { key: 'spotlight', label: 'À la une', seconds: 12, qr: true, render: () => <SpotlightScene spotlight={data.spotlight} /> },
    data.nextInterview && { key: 'interview', label: 'Studio', seconds: 10, render: () => <InterviewScene interview={data.nextInterview} /> },
    hasCounters && { key: 'counters', label: 'Chiffres', seconds: 10, render: () => <CountersScene counters={counters} /> },
    data.capsules?.length && { key: 'capsules', label: 'Capsules', seconds: 12, qr: true, render: () => <CapsulesScene capsules={data.capsules} /> },
    data.stands?.length && { key: 'stands', label: 'Stands', seconds: Math.min(60, Math.ceil((STANDS_START + data.stands.length * STANDS_STEP) / 1000 + 2.4)), render: () => <StandsScene stands={data.stands} /> },
    { key: 'closing', label: 'API-ZF', seconds: CLOSING_SECONDS, render: () => <ClosingScene /> },
  ];
  return scenes.filter(Boolean);
};

// La scène 1920 × 1080 est mise à l'échelle de l'écran, quel qu'il soit, sans jamais déborder.
function useStageScale() {
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return scale;
}

// Garde l'écran allumé (pas de mise en veille) tant que la page est ouverte.
function useWakeLock() {
  useEffect(() => {
    let lock = null;
    const request = () => {
      if (document.visibilityState !== 'visible' || !navigator.wakeLock) return;
      navigator.wakeLock.request('screen').then((value) => { lock = value; }).catch(() => {});
    };
    request();
    document.addEventListener('visibilitychange', request);
    return () => { document.removeEventListener('visibilitychange', request); lock?.release().catch(() => {}); };
  }, []);
}

export default function ScreenPage() {
  const [data, setData] = useState(null);
  // Vidéo de repli qui n'a pas pu être lue : l'écran repasse en direct au lieu de rester noir.
  const [failedVideo, setFailedVideo] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [current, setCurrent] = useState({ key: 'opener', run: 0 });
  const [leaving, setLeaving] = useState(false);
  const [thread, setThread] = useState(null);
  const scale = useStageScale();
  const dataRef = useRef(null);
  const cameraRef = useRef(null);
  const anchorRef = useRef(null);
  useWakeLock();

  // Pose le trait jaune sur un emplacement : position dans l'image, sans tenir compte des animations en cours.
  const place = useCallback((element) => {
    if (!element?.isConnected) return;
    anchorRef.current = element;
    if (!cameraRef.current) return; // tout premier rendu : l'image n'est pas encore en place, le recalage suit
    let x = 0;
    let y = 0;
    for (let node = element; node && node !== cameraRef.current; node = node.offsetParent) {
      x += node.offsetLeft;
      y += node.offsetTop;
    }
    const next = { x, y, w: element.offsetWidth, h: element.offsetHeight };
    setThread((value) => (value && value.x === next.x && value.y === next.y && value.w === next.w && value.h === next.h ? value : next));
  }, []);

  useEffect(() => {
    let active = true;
    const load = () => api.screen().then((result) => { if (active) { dataRef.current = result; setData(result); } }).catch(() => {});
    load();
    const refresh = window.setInterval(load, REFRESH);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    document.fonts?.ready.then(() => { if (active) place(anchorRef.current); }).catch(() => {});
    return () => { active = false; window.clearInterval(refresh); window.clearInterval(clock); };
  }, [place]);

  // Chaque seconde, le trait se recale : une donnée rafraîchie peut avoir déplacé son emplacement.
  useEffect(() => { place(anchorRef.current); }, [now, place]);

  const scenes = useMemo(() => buildScenes(data), [data]);
  const index = Math.max(0, scenes.findIndex((scene) => scene.key === current.key));
  const scene = scenes[index];
  const sceneRef = useRef(scene);
  sceneRef.current = scene;

  // À la fin de la scène, elle s'efface en fondu, puis la suivante arrive.
  // La durée est lue à l'arrivée de la scène : un rafraîchissement des données ne la relance pas.
  useEffect(() => {
    const playing = sceneRef.current;
    const total = playing.seconds * 1000;
    const leave = window.setTimeout(() => setLeaving(true), total - LEAVE);
    const next = window.setTimeout(() => {
      const list = buildScenes(dataRef.current);
      const position = list.findIndex((item) => item.key === playing.key);
      const following = list[(position + 1) % list.length];
      setLeaving(false);
      setCurrent((value) => ({ key: following.key, run: value.run + 1 }));
    }, total);
    return () => { window.clearTimeout(leave); window.clearTimeout(next); };
  }, [current.run]);

  // Plein écran au premier clic ou à la touche F.
  useEffect(() => {
    const full = () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {}); };
    const key = (event) => { if (event.key === 'f' || event.key === 'F') full(); };
    window.addEventListener('click', full);
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('click', full); window.removeEventListener('keydown', key); };
  }, []);

  const fallback = data?.mode === 'video' && data.videoUrl !== failedVideo ? videoSource(data.videoUrl) : null;
  if (fallback) {
    return (
      <main className="screen is-video">
        {fallback.kind === 'youtube'
          ? <iframe src={fallback.src} title="Vidéo du Hub" allow="autoplay; encrypted-media" referrerPolicy="strict-origin-when-cross-origin" />
          : <video key={fallback.src} src={resolveAssetUrl(fallback.src)} autoPlay muted loop playsInline onError={() => setFailedVideo(data.videoUrl)} />}
      </main>
    );
  }

  const time = formats.time.format(new Date(now));

  return (
    <main className="screen">
      <div className="s-stage" data-tone={current.run % 3} data-scene={scene.key} style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
        <div className="s-backdrop" aria-hidden="true">
          <span className="s-aura is-a"><i /></span>
          <span className="s-aura is-b"><i /></span>
          <img className="s-watermark" src={hubSymbolWhite} alt="" />
          <span className="s-vignette" />
          <span className="s-grain" />
        </div>

        <header className="s-top">
          <img src={hubLogoWhite} alt="Hub de l’investissement" />
          <span className="s-top-date">{formats.day.format(new Date(now))}</span>
          <strong className="s-top-clock">{time.slice(0, 2)}<i>:</i>{time.slice(3)}</strong>
        </header>

        <div className="s-camera" ref={cameraRef}>
          <ThreadContext.Provider value={place}>
            <section className={`s-frame${leaving ? ' is-leaving' : ''}`} key={`${scene.key}-${current.run}`}>
              {scene.render()}
            </section>
          </ThreadContext.Provider>
          <span
            className={`s-thread${thread ? ' is-on' : ''}`}
            style={thread ? { left: thread.x, top: thread.y, width: thread.w, height: thread.h } : undefined}
            aria-hidden="true"
          />
        </div>

        <footer className="s-chapter" key={`chapter-${current.run}`} aria-hidden="true">
          <b>{String(index + 1).padStart(2, '0')}</b>
          <span className="s-chapter-line"><i style={{ animationDuration: `${scene.seconds}s` }} /></span>
          <span>{scene.label}</span>
        </footer>
        <footer className={`s-site${scene.qr ? ' is-hidden' : ''}`}><Qr url={SITE_URL} size={84} /><b>hub.investir.tg</b></footer>
        <span className="s-band" aria-hidden="true" />
      </div>
    </main>
  );
}
