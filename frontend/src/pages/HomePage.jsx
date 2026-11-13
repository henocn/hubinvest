import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowRight, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api, resolveAssetUrl } from '../lib/api';
import { publicErrorMessage } from '../lib/public-error';

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
    shortDay: new Intl.DateTimeFormat(locale, { timeZone: HUB_TIME_ZONE, weekday: 'short', day: 'numeric' }),
    time: new Intl.DateTimeFormat(locale, { timeZone: HUB_TIME_ZONE, hour: '2-digit', minute: '2-digit' }),
  };
}

// Indique si un élément du programme est terminé, en cours ou à venir.
function eventState(event, now) {
  if (now < new Date(event.startsAt).getTime()) return 'next';
  if (event.endsAt && now < new Date(event.endsAt).getTime()) return 'live';
  return 'done';
}

// Affiche l'occupant mis à l'affiche du jour, image séparée de ses informations.
function SpotlightCard({ spotlight }) {
  const { t } = useTranslation();
  const { occupant } = spotlight;
  return (
    <Link className="home-spotlight" to={`/stands/${occupant.slug}`}>
      <div className="home-spotlight-cover">
        {occupant.coverImageUrl
          ? <img src={resolveAssetUrl(occupant.coverImageUrl)} alt="" />
          : <span aria-hidden="true">{occupant.name.slice(0, 1)}</span>}
      </div>
      <div className="home-spotlight-content">
        <span className="public-eyebrow">{t('home.spotlight')}</span>
        <h2>{occupant.name}</h2>
        {(spotlight.location || occupant.standLabel) && (
          <span className="stand-location"><MapPin size={14} aria-hidden="true" /> {spotlight.location || occupant.standLabel}</span>
        )}
        {(spotlight.description || occupant.activity) && <p>{spotlight.description || occupant.activity}</p>}
      </div>
    </Link>
  );
}

// Affiche une ligne du programme : horaire, type, titre, lieu et stand concerné.
function ProgramItem({ event, formats, now, showDay }) {
  const { t } = useTranslation();
  const state = showDay ? 'next' : eventState(event, now);
  const location = event.location || event.occupant?.standLabel;

  return (
    <li className={`program-item is-${state}`}>
      <time dateTime={event.startsAt}>
        {showDay && <small>{formats.shortDay.format(new Date(event.startsAt))}</small>}
        <strong>{formats.time.format(new Date(event.startsAt))}</strong>
        {!showDay && event.endsAt && <small>{formats.time.format(new Date(event.endsAt))}</small>}
      </time>
      <div>
        <span className="program-labels">
          <span className={`program-type is-${event.type}`}>{t(`program.types.${event.type}`)}</span>
          {state === 'live' && <span className="program-state is-live">{t('home.live')}</span>}
          {state === 'done' && <span className="program-state">{t('home.done')}</span>}
        </span>
        <strong>{event.title}</strong>
        {(location || event.occupant) && (
          <span className="program-meta">
            {location && <span><MapPin size={13} aria-hidden="true" /> {location}</span>}
            {event.occupant && <Link to={`/stands/${event.occupant.slug}`}>{event.occupant.name}</Link>}
          </span>
        )}
      </div>
    </li>
  );
}

// Page d'accueil : occupant à l'affiche, programme du jour et prochains rendez-vous du Hub.
export default function HomePage() {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const now = useNow();
  const formats = useHubFormats(i18n.resolvedLanguage);

  useEffect(() => {
    setLoading(true);
    setError('');
    api.publicToday()
      .then(setData)
      .catch((requestError) => setError(publicErrorMessage(t, requestError)))
      .finally(() => setLoading(false));
  }, [t]);

  const isEmpty = data && !data.spotlight && data.today.length === 0 && data.upcoming.length === 0;

  return (
    <>
      <section className="public-intro home-intro">
        <div className="public-container">
          <h1>{t('home.title')}</h1>
          <p className="home-date">{formats.day.format(data ? new Date(data.date) : new Date(now))}</p>
        </div>
      </section>
      <main className="public-container public-main home-main">
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
              <section className="home-panel" aria-labelledby="home-today-title">
                <h2 id="home-today-title">{t('home.today')}</h2>
                {data.today.length > 0
                  ? <ol className="program-list">{data.today.map((event) => <ProgramItem event={event} formats={formats} now={now} key={event.id} />)}</ol>
                  : <p className="home-panel-empty">{t('home.noToday')}</p>}
              </section>
              {data.upcoming.length > 0 && (
                <section className="home-panel" aria-labelledby="home-upcoming-title">
                  <h2 id="home-upcoming-title">{t('home.upcoming')}</h2>
                  <ol className="program-list">{data.upcoming.map((event) => <ProgramItem event={event} formats={formats} now={now} showDay key={event.id} />)}</ol>
                </section>
              )}
            </div>
            <Link className="home-explore-link" to="/stands">{t('home.exploreStands')} <ArrowRight size={16} aria-hidden="true" /></Link>
          </>
        )}
      </main>
    </>
  );
}
