import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, MessageCircleQuestion, RotateCcw, X } from 'lucide-react';
import { api } from '../lib/api';
import { useRealtimeEvent } from '../lib/realtime';

const timeFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', hour: '2-digit', minute: '2-digit' });

const views = [
  { value: 'new', label: 'À poser' },
  { value: 'asked', label: 'Posées' },
  { value: 'dismissed', label: 'Écartées' },
];

// Questions envoyées par le public pendant les directs : l'animateur les lit sur son téléphone,
// les pose à l'antenne puis les marque « posées », sans que personne n'entre dans le Studio.
export default function LiveQuestionsPage({ session, onLogout }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('new');
  const [busyId, setBusyId] = useState('');
  const knownIds = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await api.liveQuestions(session.token);
      // Une nouvelle question fait vibrer le téléphone de l'animateur.
      const fresh = data.filter((item) => item.status === 'new' && knownIds.current && !knownIds.current.has(item.id));
      if (fresh.length && navigator.vibrate) navigator.vibrate(180);
      knownIds.current = new Set(data.map((item) => item.id));
      setQuestions(data);
      setError('');
    } catch (requestError) {
      if (requestError.status === 401 || requestError.status === 403) onLogout();
      else setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [onLogout, session.token]);

  useEffect(() => { void load(); }, [load]);
  useRealtimeEvent('live-questions', () => { void load(); });

  const setStatus = async (id, status) => {
    setBusyId(id);
    setQuestions((current) => current.map((item) => (item.id === id ? { ...item, status } : item)));
    try {
      await api.updateLiveQuestion(session.token, id, status);
    } catch (requestError) {
      if (requestError.status === 401 || requestError.status === 403) onLogout();
      else setError(requestError.message);
      void load();
    } finally {
      setBusyId('');
    }
  };

  const counts = useMemo(() => questions.reduce((total, item) => ({ ...total, [item.status]: (total[item.status] || 0) + 1 }), {}), [questions]);

  // Regroupées par direct ; les questions à poser dans l'ordre d'arrivée, les autres les plus récentes d'abord.
  const groups = useMemo(() => {
    const visible = questions
      .filter((item) => item.status === view)
      .sort((a, b) => (view === 'new' ? 1 : -1) * (new Date(a.createdAt) - new Date(b.createdAt)));
    const byEvent = new Map();
    visible.forEach((item) => {
      const key = item.event?.id || 'autre';
      if (!byEvent.has(key)) byEvent.set(key, { event: item.event, items: [] });
      byEvent.get(key).items.push(item);
    });
    return [...byEvent.values()].sort((a, b) => Number(Boolean(b.event?.live)) - Number(Boolean(a.event?.live)));
  }, [questions, view]);

  return (
    <main className="workspace live-questions-workspace">
      <h1>Questions du public</h1>
      <div className="live-questions-tabs" role="tablist" aria-label="Questions">
        {views.map((item) => (
          <button key={item.value} type="button" role="tab" aria-selected={view === item.value} className={view === item.value ? 'is-active' : ''} onClick={() => setView(item.value)}>
            {item.label}
            {counts[item.value] > 0 && <span>{counts[item.value]}</span>}
          </button>
        ))}
      </div>

      {error && <p className="panel-error" role="alert">{error}</p>}
      {loading && <p className="empty-state">Chargement des questions…</p>}
      {!loading && !groups.length && (
        <div className="empty-state">
          <MessageCircleQuestion size={28} />
          <strong>{view === 'new' ? 'Aucune question en attente' : 'Aucune question'}</strong>
          {view === 'new' && <span>Pendant un direct, le public pose ses questions depuis le programme du site.</span>}
        </div>
      )}

      {groups.map(({ event, items }) => (
        <section className="live-questions-group" key={event?.id || 'autre'}>
          <header>
            <strong>{event?.title || 'Direct'}</strong>
            <span>
              {event?.live && <b className="live-pill">En direct</b>}
              {event?.startsAt && timeFormatter.format(new Date(event.startsAt))}
              {event?.location && ` · ${event.location}`}
            </span>
          </header>
          <ul>
            {items.map((item) => (
              <li key={item.id} className={`live-question is-${item.status}`}>
                <p>{item.question}</p>
                <small>{item.authorName || 'Anonyme'} · {timeFormatter.format(new Date(item.createdAt))}</small>
                <div className="live-question-actions">
                  {item.status === 'new' ? (
                    <>
                      <button className="button button-primary" type="button" onClick={() => setStatus(item.id, 'asked')} disabled={busyId === item.id}><Check size={18} /> Posée</button>
                      <button className="button button-secondary" type="button" onClick={() => setStatus(item.id, 'dismissed')} disabled={busyId === item.id}><X size={18} /> Écarter</button>
                    </>
                  ) : (
                    <button className="button button-secondary" type="button" onClick={() => setStatus(item.id, 'new')} disabled={busyId === item.id}><RotateCcw size={17} /> Remettre à poser</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
