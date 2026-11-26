import { useEffect, useRef, useState } from 'react';
import { Check, MessageCircleQuestion, SendHorizontal, X } from 'lucide-react';
import { api } from '../lib/api';

// Agent de l'espace équipe : un bouton en bas à droite ouvre la discussion.
// Il cherche, lit et prépare créations et modifications avec les droits du compte connecté (jamais de suppression).
// Une action préparée s'affiche sous sa réponse : rien n'est enregistré avant « Confirmer ».
// Il n'apparaît que si le serveur est branché au modèle ; la discussion reste ouverte tant que l'application l'est.
const SUGGESTIONS = {
  occupant: ['Qui dois-je relancer aujourd’hui ?', 'Que manque-t-il à la fiche de mon stand ?', 'Quelles demandes B2B attendent une réponse ?'],
  team: ['Qu’est-ce qui attend une action aujourd’hui ?', 'Quels stands ont publié des besoins B2B ?', 'Qui doit encore recevoir son lot ?'],
  animateur: ['Quelles questions du public sont à poser ?', 'Un joueur a perdu son code'],
};
const HISTORY = 8; // derniers messages renvoyés avec la question, pour que l'agent suive le fil
const ACTION_STATES = { done: 'Confirmée', cancelled: 'Annulée', pending: 'Non confirmée', error: 'Échouée' };

// Ce que l'agent relit d'un message : son texte, et le sort des actions qu'il avait préparées.
// Un mot de passe montré à la personne n'en fait jamais partie.
const forHistory = (item) => {
  const outcomes = (item.actions || []).map((action) => `${ACTION_STATES[action.state] || 'Non confirmée'} : ${action.summary}${action.result ? ` (${action.result})` : ''}`);
  return { role: item.role, content: [item.content, ...outcomes].filter(Boolean).join('\n') };
};

function ActionCard({ action, onConfirm, onCancel }) {
  const busy = action.state === 'running';
  const open = action.state === 'pending' || busy;
  return (
    <div className={`assistant-action is-${action.state}`}>
      <p>{action.summary}</p>
      {open ? (
        <div className="assistant-action-buttons">
          <button className="button button-primary" type="button" onClick={onConfirm} disabled={busy}><Check size={18} aria-hidden="true" />{busy ? 'En cours…' : 'Confirmer'}</button>
          <button className="button button-secondary" type="button" onClick={onCancel} disabled={busy}>Annuler</button>
        </div>
      ) : (
        <p className="assistant-action-result">{action.state === 'cancelled' ? 'Annulée.' : action.result}</p>
      )}
      {action.reveal && <p className="assistant-action-reveal">{action.reveal}</p>}
    </div>
  );
}

export default function Assistant({ token, user }) {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    let active = true;
    api.assistantStatus(token).then((result) => { if (active) setEnabled(Boolean(result?.enabled)); }).catch(() => {});
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    if (!open) return undefined;
    inputRef.current?.focus();
    const closeOnEscape = (event) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  // Le dernier message reste visible.
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages, loading, error, open]);

  if (!enabled) return null;

  const send = async (text) => {
    const message = text.trim();
    if (!message || loading) return;
    const history = messages.slice(-HISTORY).map(forHistory);
    setMessages([...messages, { role: 'user', content: message }]);
    setDraft('');
    setError('');
    setLoading(true);
    try {
      const result = await api.askAssistant(token, { message, history });
      const actions = (result.actions || []).map((action) => ({ ...action, state: 'pending' }));
      setMessages((current) => [...current, { role: 'assistant', content: result.answer, actions }]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  // Met à jour une action d'un message.
  const updateAction = (messageIndex, actionIndex, values) => setMessages((current) => current.map((item, index) => (
    index === messageIndex ? { ...item, actions: item.actions.map((action, position) => (position === actionIndex ? { ...action, ...values } : action)) } : item
  )));

  const confirmAction = async (messageIndex, actionIndex) => {
    const action = messages[messageIndex].actions[actionIndex];
    updateAction(messageIndex, actionIndex, { state: 'running' });
    try {
      const result = await api.confirmAssistantAction(token, action.token);
      updateAction(messageIndex, actionIndex, { state: 'done', result: result.message, reveal: result.reveal || null });
    } catch (requestError) {
      updateAction(messageIndex, actionIndex, { state: 'error', result: requestError.message });
    }
  };

  const submit = (event) => {
    event.preventDefault();
    void send(draft);
  };

  if (!open) {
    return (
      <button className="assistant-launcher" type="button" onClick={() => setOpen(true)} aria-label="Ouvrir l’assistant" title="Assistant">
        <MessageCircleQuestion size={26} aria-hidden="true" />
      </button>
    );
  }

  const suggestions = SUGGESTIONS[user.role] || SUGGESTIONS.team;

  return (
    <section className="assistant-panel" role="dialog" aria-label="Assistant">
      <header className="assistant-head">
        <h2>Assistant</h2>
        <button className="team-icon-button" type="button" onClick={() => setOpen(false)} aria-label="Fermer l’assistant" title="Fermer"><X size={22} /></button>
      </header>

      <div className="assistant-thread" aria-live="polite">
        <p className="assistant-message is-assistant">Bonjour {user.firstName}. Que voulez-vous faire ?</p>
        {messages.length === 0 && (
          <div className="assistant-suggestions">
            {suggestions.map((item) => <button key={item} type="button" onClick={() => send(item)}>{item}</button>)}
          </div>
        )}
        {messages.map((item, index) => (
          <div key={index} className={`assistant-turn is-${item.role}`}>
            {item.content && <p className={`assistant-message is-${item.role}`}>{item.content}</p>}
            {(item.actions || []).map((action, position) => (
              <ActionCard
                key={position}
                action={action}
                onConfirm={() => confirmAction(index, position)}
                onCancel={() => updateAction(index, position, { state: 'cancelled' })}
              />
            ))}
          </div>
        ))}
        {loading && <p className="assistant-message is-assistant is-writing" aria-label="L’assistant travaille"><i /><i /><i /></p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <span ref={endRef} />
      </div>

      <form className="assistant-form" onSubmit={submit}>
        <input ref={inputRef} type="text" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1500} aria-label="Votre demande" autoComplete="off" enterKeyHint="send" />
        <button className="button button-primary" type="submit" disabled={loading || !draft.trim()} aria-label="Envoyer" title="Envoyer"><SendHorizontal size={20} aria-hidden="true" /></button>
      </form>
    </section>
  );
}
