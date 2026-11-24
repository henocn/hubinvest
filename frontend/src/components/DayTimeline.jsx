import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Échelle de la grille : 1,8 px par minute (108 px par heure) ; un bloc court reste lisible sur deux lignes.
const PX_PER_MINUTE = 1.8;
const MIN_BLOCK = 74;
const DEFAULT_DURATION = 45 * 60_000;
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
// Une pause de plus d'une heure sans rendez-vous est resserrée en une fine bande.
const GAP_THRESHOLD = HOUR;
const GAP_PX = 34;

const stateOf = (item, now) => {
  if (now < item.start) return 'next';
  if (now < item.end) return 'live';
  return 'done';
};

// Répartit les rendez-vous qui se chevauchent sur plusieurs colonnes, côte à côte.
const layout = (items) => {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  const clusters = [];
  sorted.forEach((item) => {
    const cluster = clusters.at(-1);
    if (cluster && item.start < cluster.end) {
      cluster.items.push(item);
      cluster.end = Math.max(cluster.end, item.end);
    } else {
      clusters.push({ items: [item], end: item.end });
    }
  });
  clusters.forEach((cluster) => {
    const laneEnds = [];
    cluster.items.forEach((item) => {
      let lane = laneEnds.findIndex((end) => end <= item.start);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = item.end;
      Object.assign(item, { lane });
    });
    cluster.items.forEach((item) => Object.assign(item, { lanes: laneEnds.length }));
  });
  return { sorted, clusters };
};

// Échelle par morceaux : les heures occupées à taille réelle, les longues pauses resserrées.
const buildScale = (clusters, rangeStart, rangeEnd) => {
  const segments = [];
  let cursor = rangeStart;
  let px = 0;
  const push = (from, to, compressed) => {
    if (to <= from) return;
    const height = compressed ? GAP_PX : ((to - from) / MINUTE) * PX_PER_MINUTE;
    segments.push({ from, to, px, height, compressed });
    px += height;
  };
  clusters.forEach((cluster) => {
    const start = cluster.items[0].start;
    if (start - cursor > GAP_THRESHOLD) {
      // On garde une demi-heure à taille réelle de chaque côté pour que les heures restent lisibles.
      push(cursor, cursor + 30 * MINUTE, false);
      push(cursor + 30 * MINUTE, start - 30 * MINUTE, true);
      push(start - 30 * MINUTE, start, false);
    } else {
      push(cursor, start, false);
    }
    push(start, cluster.end, false);
    cursor = cluster.end;
  });
  push(cursor, rangeEnd, false);
  const toPx = (time) => {
    const segment = segments.find((item) => time >= item.from && time <= item.to) || segments.at(-1);
    if (!segment) return 0;
    return segment.px + ((Math.min(Math.max(time, segment.from), segment.to) - segment.from) / (segment.to - segment.from || 1)) * segment.height;
  };
  return { segments, toPx, total: px };
};

// Programme du jour en grille horaire : chaque rendez-vous posé à son heure, aussi haut que sa durée,
// teinté selon son type ; une ligne rouge à l'heure actuelle ; les rendez-vous passés repliés.
export default function DayTimeline({ events, formats, now }) {
  const { t } = useTranslation();
  const [showPast, setShowPast] = useState(false);

  const all = events.map((event) => {
    const start = new Date(event.startsAt).getTime();
    const end = event.endsAt ? new Date(event.endsAt).getTime() : start + DEFAULT_DURATION;
    return { event, start, end };
  });
  const past = all.filter((item) => stateOf(item, now) === 'done');
  const shown = showPast ? all : all.filter((item) => stateOf(item, now) !== 'done');
  const { sorted, clusters } = layout(shown);

  const toggle = past.length > 0 && (
    <button className={`program-past-toggle${showPast ? ' is-open' : ''}`} type="button" onClick={() => setShowPast((current) => !current)}>
      {showPast ? t('home.hidePast') : t('home.showPast', { count: past.length })}
      <ChevronDown size={16} aria-hidden="true" />
    </button>
  );

  // Journée finie : seulement le bouton pour revoir ce qui s'est passé, sans message.
  if (!sorted.length) return toggle || null;

  // Si rien n'est en cours, la grille commence un peu avant maintenant pour placer la ligne de l'heure.
  const first = Math.min(...sorted.map((item) => item.start), showPast ? Infinity : now);
  const last = Math.max(...sorted.map((item) => item.end));
  const rangeStart = Math.floor(first / HOUR) * HOUR;
  const rangeEnd = Math.ceil(last / HOUR) * HOUR;
  const { segments, toPx, total } = buildScale(clusters, rangeStart, rangeEnd);
  const hours = Array.from({ length: (rangeEnd - rangeStart) / HOUR + 1 }, (_, index) => rangeStart + index * HOUR)
    .filter((hour) => !segments.some((segment) => segment.compressed && hour > segment.from && hour < segment.to));
  const showNow = now >= rangeStart && now <= rangeEnd;

  return (
    <>
      {toggle}
      <div className="day-timeline" style={{ height: `${total + 12}px` }}>
        {hours.map((hour) => (
          <div className="day-hour" key={hour} style={{ top: `${toPx(hour)}px` }}>
            <span>{formats.time.format(new Date(hour))}</span>
          </div>
        ))}

        {segments.filter((segment) => segment.compressed).map((segment) => (
          <div className="day-gap" key={segment.from} style={{ top: `${segment.px}px`, height: `${segment.height}px` }}>
            <span>{t('home.break')}</span>
          </div>
        ))}

        <ol className="day-blocks">
          {sorted.map((item) => {
            const { event } = item;
            const state = stateOf(item, now);
            const height = Math.max(toPx(item.end) - toPx(item.start) - 4, MIN_BLOCK);
            const location = event.location || event.occupant?.standLabel;
            return (
              <li
                key={event.id}
                className={`day-block type-${event.type} is-${state}${height < 100 ? ' is-short' : ''}${item.lanes > 1 ? ' is-narrow' : ''}`}
                style={{
                  top: `${toPx(item.start) + 2}px`,
                  height: `${height}px`,
                  left: `calc(${(item.lane / item.lanes) * 100}% + ${item.lane ? 4 : 0}px)`,
                  width: `calc(${100 / item.lanes}% - ${item.lanes > 1 ? 4 : 0}px)`,
                }}
              >
                <span className="day-block-time">
                  {state === 'live' && <span className="day-block-now">{t('home.now')} · </span>}
                  {formats.time.format(new Date(item.start))}
                  {event.endsAt && `–${formats.time.format(new Date(item.end))}`}
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
          })}
        </ol>

        {showNow && (
          <div className="day-now" style={{ top: `${toPx(now)}px` }} aria-hidden="true">
            <span>{formats.time.format(new Date(now))}</span>
          </div>
        )}
      </div>
    </>
  );
}
