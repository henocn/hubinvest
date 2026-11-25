import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check, MapPin, Mic } from 'lucide-react';
import { api, resolveAssetUrl } from '../lib/api';
import { PROCEDURES_URL, procedures, services } from '../content/services';
import hubLogoWhite from '../assets/brand/hub-logo-white.png';
import hubSymbolWhite from '../assets/brand/hub-symbol-white.png';
import apizfLogo from '../assets/brand/apizf-logo.png';
import '../screen.css';

// Grand écran du Stand API-ZF (65 pouces, 16:9) : un film de marque qui tourne en boucle, pas une page web.
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
const TYPES = { spotlight: 'À l’affiche', highlight: 'Temps fort', animation: 'Animation', studio: 'Studio', talk: 'Prise de parole' };
const COUNTERS = [
  ['players', 'Joueurs des Défis'],
  ['guichetMeetings', 'Rendez-vous aux guichets'],
  ['b2bMeetings', 'Rencontres B2B tenues'],
  ['capsules', 'Capsules livrées'],
];
const DOMAINS = [['free_zone', 'Zone Franche'], ['investment_code', 'Code des investissements'], ['blue_book', 'Carnet Bleu']];
const PROGRAM_STEP = 2400; // temps passé sur chaque ligne du programme
const SERVICE_STEP = 2300; // temps passé sur chaque service
const STANDS_PER_ROW = 6; // six stands couvrent la largeur de l'écran

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

// Ligne mise en avant à tour de rôle dans une liste.
function useCycle(count, period, delay) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (count < 2) return undefined;
    let tick;
    const timer = window.setTimeout(() => {
      setIndex(1);
      tick = window.setInterval(() => setIndex((value) => (value + 1) % count), period);
    }, delay + period);
    return () => { window.clearTimeout(timer); window.clearInterval(tick); };
  }, [count, period, delay]);
  return Math.min(index, Math.max(0, count - 1));
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

// Roue qui tourne puis ralentit, sans fin : lots en vert, cases perdantes en blanc.
function SpinningWheel() {
  const slices = 10;
  const point = (angle) => `${100 + 92 * Math.cos(angle)} ${100 + 92 * Math.sin(angle)}`;
  const paths = Array.from({ length: slices }, (_, index) => {
    const a = (index / slices) * Math.PI * 2;
    const b = ((index + 1) / slices) * Math.PI * 2;
    return <path key={index} d={`M100 100 L${point(a)} A92 92 0 0 1 ${point(b)} Z`} fill={index % 2 ? '#ffffff' : '#156c53'} />;
  });
  return (
    <span className="s-wheel">
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <circle cx="100" cy="100" r="98" fill="#ffffff" />
        <g className="s-wheel-spin">{paths}</g>
        <circle cx="100" cy="100" r="13" fill="#ffcf15" />
      </svg>
      <span className="s-wheel-pin" />
    </span>
  );
}

const live = (event, now) => new Date(event.startsAt).getTime() <= now && now < new Date(event.endsAt || event.startsAt).getTime();

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

function ProgramScene({ items, now }) {
  const focus = useCycle(items.length, PROGRAM_STEP, 1600);
  const onList = useAfter(1700); // le trait quitte le titre et devient le repère de la liste
  return (
    <div className="s-scene s-program">
      <Head title="Aujourd’hui au Hub" thread={!onList} />
      <div className="s-list" style={{ '--i': focus }}>
        <Anchor className="is-marker" active={onList} watch={focus} />
        <ol>
          {items.map((event, index) => {
            const isLive = live(event, now);
            return (
              <li key={event.id} className={`m-in${index === focus ? ' is-focus' : ''}`} style={at(0.8 + index * 0.12)}>
                <strong className="s-row-time">{formats.time.format(new Date(event.startsAt))}</strong>
                <span className="s-row-text">
                  <b>{event.title}</b>
                  <small className={isLive ? 'is-live' : ''}>
                    {isLive ? <><i className="s-live-dot" />En ce moment</> : TYPES[event.type]}
                    {event.location && ` · ${event.location}`}
                  </small>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
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
    </div>
  );
}

function ServicesScene() {
  const focus = useCycle(services.length, SERVICE_STEP, 1800);
  const onList = useAfter(1900);
  const cycled = useRef(false);
  if (focus > 0) cycled.current = true;
  const base = cycled.current ? 0 : 1;
  const service = services[focus];
  return (
    <div className="s-scene s-services">
      <div className="s-services-detail">
        <Head title="Les services de l’API-ZF" thread={!onList} />
        <div className="s-services-focus" key={service.key}>
          <In className="s-kicker" delay={base}>Étape {service.stage}</In>
          <Words as="h3" className="s-services-title" delay={base + 0.1}>{service.fr.title}</Words>
          <In as="p" className="s-lead" delay={base + 0.35}>{service.fr.promise}</In>
        </div>
      </div>
      <div className="s-list is-index" style={{ '--i': focus }}>
        <Anchor className="is-marker" active={onList} watch={focus} />
        <ol>
          {services.map((item, index) => (
            <li key={item.key} className={`m-in${index === focus ? ' is-focus' : ''}`} style={at(0.8 + index * 0.1)}>
              <span className="s-row-stage">{item.stage}</span>
              <b>{item.fr.title}</b>
            </li>
          ))}
        </ol>
      </div>
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
      <div>
        <In className="s-kicker" delay={0.5}>L’entreprise à la une</In>
        <Words as="h2" className="s-display" delay={0.7}>{occupant.name}</Words>
        <Anchor className="is-rule is-spaced" />
        {place && <In as="p" className="s-place" delay={1.4}><MapPin aria-hidden="true" />{place}</In>}
      </div>
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

// Une rangée de stands. Assez de stands pour dépasser la largeur de l'écran : la rangée glisse sans fin, et la
// même entreprise n'est jamais visible deux fois. Sinon, la rangée reste fixe et centrée.
// Chaque logo arrive de plus loin, un par un, et rattrape sa place dans la rangée.
function StandsRow({ stands, reverse, moving }) {
  const track = moving ? [...stands, ...stands] : stands;
  return (
    <ul className={`s-stands-track${moving ? '' : ' is-static'}${reverse ? ' is-reverse' : ''}`} style={{ animationDuration: `${stands.length * 7}s` }}>
      {track.map((stand, index) => (
        <li key={index}>
          <span className="s-stands-item" style={at(1.5 + (index % stands.length) * 0.16)}>
            {stand.logoUrl
              ? <><span className="s-stands-logo"><img src={resolveAssetUrl(stand.logoUrl)} alt="" /></span><span className="s-stands-name">{stand.name}</span></>
              : <b className="s-stands-word">{stand.name}</b>}
          </span>
        </li>
      ))}
    </ul>
  );
}

function StandsScene({ stands }) {
  const twoRows = stands.length >= STANDS_PER_ROW * 2;
  const split = twoRows ? Math.ceil(stands.length / 2) : stands.length;
  const rows = [stands.slice(0, split), stands.slice(split)].filter((row) => row.length);
  return (
    <div className="s-scene s-stands">
      <Head title="Les stands du Hub" sub="Pavillon de l’Oti" />
      <div className="s-stands-band" style={at(0.8)}>
        {rows.map((row, index) => <StandsRow key={index} stands={row} reverse={index === 1} moving={row.length >= STANDS_PER_ROW} />)}
      </div>
    </div>
  );
}

function GamesScene() {
  return (
    <div className="s-scene s-games">
      <Head title="Deux jeux, des lots à gagner" />
      <div className="s-games-row">
        <section className="m-in" style={at(0.9)}>
          <span className="s-games-visual">
            <span className="s-stamps">{[0, 1, 2, 3, 4].map((index) => <i key={index} style={at(1.8 + index * 0.45)}><Check aria-hidden="true" /></i>)}</span>
          </span>
          <strong>Défi de passage</strong>
          <span>Cinq étapes à valider</span>
        </section>
        <section className="m-in" style={at(1.1)}>
          <span className="s-games-visual"><SpinningWheel /></span>
          <strong>Roue des opportunités</strong>
          <span>Un code de jeu, un tour de roue</span>
        </section>
        <section className="s-games-qr m-in" style={at(1.3)}>
          <Qr url={`${SITE_URL}/defis`} size={250} />
          <strong>Scannez pour jouer</strong>
        </section>
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

function ProceduresScene() {
  return (
    <div className="s-scene s-procedures">
      <div>
        <In className="s-kicker" delay={0.3}>Plateforme de l’API-ZF</In>
        <In as="strong" className="s-procedures-count" delay={0.5}><CountUp value={procedures.length} delay={0.7} duration={1600} /></In>
        <Words as="h2" className="s-procedures-title" delay={0.9}>démarches à faire en ligne</Words>
        <Anchor className="is-rule is-spaced" />
        <ul>
          {DOMAINS.map(([domain, label], index) => (
            <li key={domain} className="m-in" style={at(1.6 + index * 0.15)}>
              <b>{procedures.filter((item) => item.domain === domain).length}</b>{label}
            </li>
          ))}
        </ul>
      </div>
      <div className="s-procedures-qr m-in" style={at(1.1)}>
        <Qr url={PROCEDURES_URL} size={320} />
        <strong>services.apizf.tg</strong>
      </div>
    </div>
  );
}

// Fin de boucle : une bande blanche s'ouvre, le logo de l'API-ZF s'y dévoile de gauche à droite, un reflet le traverse.
function ClosingScene() {
  return (
    <div className="s-scene s-closing">
      <In className="s-closing-kicker" delay={0.3}>Une initiative de</In>
      <Anchor className="is-rule is-center" />
      <div className="s-closing-band" style={at(0.7)}>
        <span className="s-closing-logo" style={at(1.5)}><img src={apizfLogo} alt="API-ZF" /></span>
      </div>
    </div>
  );
}

// ——— Mise en scène ———

const OPENER = { key: 'opener', label: 'Hub de l’investissement', seconds: 8, render: () => <OpenerScene /> };

// Les scènes de la boucle, dans l'ordre, avec leur durée (secondes). Une scène sans donnée n'est pas jouée.
const buildScenes = (data, now) => {
  if (!data) return [OPENER];
  const service = services.find((item) => item.key === data.service);
  const program = (data.program || []).filter((event) => new Date(event.endsAt || event.startsAt).getTime() > now).slice(0, 5);
  const counters = data.counters || {};
  const hasCounters = COUNTERS.some(([key]) => Number(counters[key]) > 0);
  const scenes = [
    OPENER,
    program.length && { key: 'program', label: 'Programme', seconds: 4 + (program.length * PROGRAM_STEP) / 1000, render: (time) => <ProgramScene items={program} now={time} /> },
    service && { key: 'service', label: 'Service du jour', seconds: 11, render: () => <ServiceScene service={service} /> },
    data.spotlight?.occupant && { key: 'spotlight', label: 'À la une', seconds: 9, render: () => <SpotlightScene spotlight={data.spotlight} /> },
    { key: 'services', label: 'Services', seconds: 3 + (services.length * SERVICE_STEP) / 1000, render: () => <ServicesScene /> },
    data.nextInterview && { key: 'interview', label: 'Studio', seconds: 9, render: () => <InterviewScene interview={data.nextInterview} /> },
    data.stands?.length && { key: 'stands', label: 'Stands', seconds: 14, render: () => <StandsScene stands={data.stands} /> },
    hasCounters && { key: 'counters', label: 'Chiffres', seconds: 10, render: () => <CountersScene counters={counters} /> },
    { key: 'games', label: 'Jeux', seconds: 12, qr: true, render: () => <GamesScene /> },
    data.capsules?.length && { key: 'capsules', label: 'Capsules', seconds: 11, qr: true, render: () => <CapsulesScene capsules={data.capsules} /> },
    { key: 'procedures', label: 'Démarches en ligne', seconds: 11, qr: true, render: () => <ProceduresScene /> },
    { key: 'closing', label: 'API-ZF', seconds: 8, render: () => <ClosingScene /> },
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

  const minute = Math.floor(now / 60_000);
  const scenes = useMemo(() => buildScenes(data, minute * 60_000), [data, minute]);
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
      const list = buildScenes(dataRef.current, Date.now());
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

  if (data?.mode === 'video') {
    return <main className="screen is-video"><video src={data.videoUrl} autoPlay muted loop playsInline /></main>;
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
              {scene.render(now)}
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
