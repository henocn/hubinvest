import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowRight, CalendarCheck, MessageCircleQuestion, PhoneCall, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api, resolveAssetUrl } from '../lib/api';
import { publicErrorMessage } from '../lib/public-error';
import { useSiteSettings } from '../lib/settings';
import LiveQuestionDialog from '../components/LiveQuestionDialog';
import DayTimeline from '../components/DayTimeline';
import HomeServices from '../components/HomeServices';

const HUB_TIME_ZONE = 'Africa/Lome';

// Renvoie l'heure actuelle et la rafraîchit chaque minute pour suivre l'avancement du programme.
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

// Prépare les formats de date et d'heure du Hub dans la langue choisie.
function useHubFormats(language) {
  const locale = language?.startsWith('en') ? 'en-GB' : 'fr-FR';
  return {
    day: new Intl.DateTimeFormat(locale, { timeZone: HUB_TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long' }),
    weekday: new Intl.DateTimeFormat(locale, { timeZone: HUB_TIME_ZONE, weekday: 'long', day: 'numeric' }),
    time: new Intl.DateTimeFormat(locale, { timeZone: HUB_TIME_ZONE, hour: '2-digit', minute: '2-digit' }),
  };
}

// Indique si un élément du programme est terminé, en cours ou à venir.
function eventState(event, now) {
  if (now < new Date(event.startsAt).getTime()) return 'next';
  if (event.endsAt && now < new Date(event.endsAt).getTime()) return 'live';
  return 'done';
}

// Questions ouvertes pendant un direct (Studio, prise de parole, temps fort), comme côté serveur :
// jusqu'à 10 minutes après la fin, ou 2 heures après le début s'il n'y a pas d'heure de fin.
const LIVE_QUESTION_TYPES = new Set(['studio', 'talk', 'highlight']);
const acceptsQuestions = (event, now) => {
  if (!LIVE_QUESTION_TYPES.has(event.type)) return false;
  const start = new Date(event.startsAt).getTime();
  const end = event.endsAt ? new Date(event.endsAt).getTime() + 10 * 60_000 : start + 2 * 60 * 60_000;
  return now >= start && now <= end;
};

// Bouton « Poser une question » avec sa fenêtre, partagé par le bandeau et la grille.
function AskButton({ event, className }) {
  const { t } = useTranslation();
  const [asking, setAsking] = useState(false);
  return (
    <>
      <button className={className} type="button" onClick={() => setAsking(true)}>
        <MessageCircleQuestion size={18} aria-hidden="true" />
        {t('live.ask')}
      </button>
      {asking && <LiveQuestionDialog event={event} onClose={() => setAsking(false)} />}
    </>
  );
}

// Bandeau d'ouverture : la date, et ce qui se passe maintenant (ou juste après) en grand, comme à l'entrée d'un festival.
function HomeHero({ data, formats, now }) {
  const { t } = useTranslation();
  const settings = useSiteSettings();
  const today = data?.today || [];
  const live = today.find((event) => eventState(event, now) === 'live');
  const next = today.find((event) => eventState(event, now) === 'next');
  const featured = live || next;
  const location = featured && (featured.location || featured.occupant?.standLabel);

  return (
    <section className="home-hero">
      <div className="public-container">
        <div className="home-hero-heading">
          <p className="home-hero-date">{formats.day.format(data ? new Date(data.date) : new Date(now))}</p>
          <h1><em className="accroche">{t('home.signatureLead')}</em> {t('home.signatureRest')}</h1>
        </div>
        <nav className="home-hero-actions" aria-label={t('home.actions')}>
          <Link className="button button-primary" to="/guichets"><CalendarCheck size={18} aria-hidden="true" />{t('home.book')}</Link>
          <Link className="button home-hero-action" to="/guichets/rappel"><PhoneCall size={18} aria-hidden="true" />{t('home.callBack')}</Link>
          <Link className="button home-hero-action" to="/defis"><Star size={18} aria-hidden="true" />{t('home.play')}</Link>
        </nav>
        {featured && (
          <div className={`home-hero-now${live ? ' is-live' : ''}`}>
            <span className="home-hero-label">
              {live ? t('home.now') : t('home.next')}
              <span>{formats.time.format(new Date(featured.startsAt))}{featured.endsAt && ` – ${formats.time.format(new Date(featured.endsAt))}`}</span>
            </span>
            <strong>{featured.title}</strong>
            <span className="home-hero-meta">
              {[t(`program.types.${featured.type}`), location, featured.occupant?.name].filter(Boolean).join(' · ')}
            </span>
            {live && settings.liveQuestionsOpen !== false && acceptsQuestions(live, now) && <AskButton event={live} className="home-hero-ask" />}
          </div>
        )}
      </div>
    </section>
  );
}

// Stand à l'affiche du jour : un bandeau discret (vignette, nom, emplacement) qui mène à sa fiche.
function SpotlightCard({ spotlight }) {
  const { t } = useTranslation();
  const { occupant } = spotlight;
  const image = occupant.logoUrl || occupant.coverImageUrl;
  const location = spotlight.location || occupant.standLabel;
  return (
    <Link className="home-spotlight" to={`/stands/${occupant.slug}`}>
      <span className={`home-spotlight-thumb${occupant.logoUrl ? ' is-logo' : ''}`}>
        {image ? <img src={resolveAssetUrl(image)} alt="" /> : <span aria-hidden="true">{occupant.name.slice(0, 1)}</span>}
      </span>
      <span className="home-spotlight-text">
        <small>{t('home.spotlight')}</small>
        <strong>{occupant.name}</strong>
        {location && <span>{location}</span>}
      </span>
      <ArrowRight className="home-spotlight-arrow" size={18} aria-hidden="true" />
    </Link>
  );
}

// Un rendez-vous à venir : même bloc de couleur que dans la grille du jour, empilé sous son jour.
function UpcomingBlock({ event, formats }) {
  const { t } = useTranslation();
  const location = event.location || event.occupant?.standLabel;
  return (
    <li className={`day-block is-static type-${event.type}`}>
      <span className="day-block-time">
        {formats.time.format(new Date(event.startsAt))}
        {event.endsAt && `–${formats.time.format(new Date(event.endsAt))}`}
        <span className="day-block-type"> · {t(`program.types.${event.type}`)}</span>
      </span>
      <strong>{event.title}</strong>
      {(location || event.occupant) && (
        <span className="day-block-meta">
          {location}
          {location && event.occupant && ' · '}
          {event.occupant && <Link to={`/stands/${event.occupant.slug}`}>{event.occupant.name}</Link>}
        </span>
      )}
    </li>
  );
}

// Programme du jour : la grille horaire de la journée.
function TodaySchedule({ events, formats, now }) {
  const { t } = useTranslation();
  return (
    <section className="home-schedule" aria-labelledby="home-today-title">
      <h2 id="home-today-title">{t('home.today')}</h2>
      {events.length > 0
        ? <DayTimeline events={events} formats={formats} now={now} />
        : <p className="home-schedule-empty">{t('home.noToday')}</p>}
    </section>
  );
}

// À venir : regroupé par jour.
function UpcomingSchedule({ events, formats }) {
  const { t } = useTranslation();
  const days = events.reduce((groups, event) => {
    const day = formats.weekday.format(new Date(event.startsAt));
    const group = groups.find((item) => item.day === day);
    if (group) group.events.push(event);
    else groups.push({ day, events: [event] });
    return groups;
  }, []);

  return (
    <section className="home-schedule is-upcoming" aria-labelledby="home-upcoming-title">
      <h2 id="home-upcoming-title">{t('home.upcoming')}</h2>
      {days.map(({ day, events: dayEvents }) => (
        <div className="program-day" key={day}>
          <h3>{day}</h3>
          <ol className="day-stack">
            {dayEvents.map((event) => <UpcomingBlock event={event} formats={formats} key={event.id} />)}
          </ol>
        </div>
      ))}
    </section>
  );
}

// Page d'accueil (document v4, M1) : la signature et les trois actions, « Nos services » et les démarches en ligne,
// puis ce qui se passe maintenant, l'entreprise à l'affiche, le programme du jour et les prochains rendez-vous.
export default function HomePage() {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const now = useNow();
  const formats = useHubFormats(i18n.resolvedLanguage);

  // Le programme se recharge seul toutes les 30 secondes et au retour sur la page : un ajout fait dans
  // l'administration apparaît sans que le visiteur recharge. Ces mises à jour silencieuses gardent l'affichage en cas d'échec.
  useEffect(() => {
    let active = true;
    const load = (silent) => {
      if (!silent) {
        setLoading(true);
        setError('');
      }
      api.publicToday()
        .then((result) => { if (active) { setData(result); setError(''); } })
        .catch((requestError) => { if (active && !silent) setError(publicErrorMessage(t, requestError)); })
        .finally(() => { if (active && !silent) setLoading(false); });
    };
    const refresh = () => { if (!document.hidden) load(true); };

    load(false);
    const interval = window.setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [t]);

  const isEmpty = data && !data.spotlight && data.today.length === 0 && data.upcoming.length === 0;

  return (
    <>
      <HomeHero data={data} formats={formats} now={now} />
      <main className="public-container home-main">
        <HomeServices />
        {loading && <p className="public-message">{t('home.loading')}</p>}
        {error && <div className="public-message is-error"><p>{error}</p></div>}
        {!loading && !error && isEmpty && (
          <div className="public-message home-empty">
            <p>{t('home.empty')}</p>
            <Link to="/stands">{t('home.exploreStands')} <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
        )}
        {!loading && !error && data && !isEmpty && (
          <>
            {data.spotlight && <SpotlightCard spotlight={data.spotlight} />}
            <div className="home-columns">
              <TodaySchedule events={data.today} formats={formats} now={now} />
              {data.upcoming.length > 0 && <UpcomingSchedule events={data.upcoming} formats={formats} />}
            </div>
          </>
        )}
      </main>
    </>
  );
}
