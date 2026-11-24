import { useCallback, useEffect, useState } from 'react';
import { dueLabel, dueState } from '../lib/due';
import { useRealtimeEvent } from '../../lib/realtime';
import { CompleteFollowUpForm, FollowUpForm, outcomeLabels } from './InvestorRequestDetail';

// Relances d'une fiche (contact du carnet, demande B2B) : à faire d'abord (rouge en retard, jaune aujourd'hui), puis les
// faites ; Ajouter et Marquer faite comme dans la page Relances. « load » renvoie toutes les relances du stand, filtrées
// par « belongs » ; les fenêtres reprennent celles de l'administration (d'où le conteneur admin-app).
export default function RelatedFollowUps({ person, topic, load, belongs, add, complete, disabled = false, hint, onLogout }) {
  const [items, setItems] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const own = (await load()).filter(belongs);
      setItems([
        ...own.filter((item) => !item.doneAt).sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt)),
        ...own.filter((item) => item.doneAt).sort((a, b) => new Date(b.doneAt) - new Date(a.doneAt)),
      ]);
    } catch (requestError) {
      if (requestError.status === 401) onLogout();
    }
  }, [belongs, load, onLogout]);

  useEffect(() => { if (!disabled) void refresh(); }, [disabled, refresh]);
  useRealtimeEvent(topic, () => { void refresh(); });

  const run = async (work) => {
    setBusy(true);
    setError('');
    try {
      await work();
      setDialog(null);
      await refresh();
    } catch (requestError) {
      if (requestError.status === 401) onLogout();
      else setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };
  const close = () => { setDialog(null); setError(''); };

  return (
    <section className="related-follow-ups">
      <header>
        <h2>Relances</h2>
        <button className="button button-secondary button-compact" type="button" onClick={() => setDialog({ type: 'add' })} disabled={disabled}>Ajouter</button>
      </header>
      {items && !items.length && <p>Aucune relance.</p>}
      {items?.length > 0 && (
        <ul>
          {items.map((item) => {
            const state = item.doneAt ? null : dueState(item.dueAt);
            return (
              <li key={item.id} className={state ? `is-${state}` : item.doneAt ? 'is-done' : ''}>
                <div>
                  <strong>{state === 'late' && 'En retard · '}{dueLabel(item.dueAt)}</strong>
                  <span>{item.reason}</span>
                  {item.doneAt && <small>{outcomeLabels[item.outcome]}{item.outcomeNote && ` · ${item.outcomeNote}`}</small>}
                </div>
                {!item.doneAt && <button className="button button-secondary button-compact" type="button" onClick={() => setDialog({ type: 'complete', item })} disabled={disabled}>Marquer faite</button>}
              </li>
            );
          })}
        </ul>
      )}
      <div className="admin-app">
        {dialog?.type === 'add' && <FollowUpForm request={{ fullName: person }} loading={busy} error={error} onClose={close} hint={hint} onSave={(values) => run(() => add(values))} />}
        {dialog?.type === 'complete' && <CompleteFollowUpForm request={{ fullName: person }} followUp={dialog.item} loading={busy} error={error} onClose={close} onSave={(values) => run(() => complete(dialog.item, values))} />}
      </div>
    </section>
  );
}
