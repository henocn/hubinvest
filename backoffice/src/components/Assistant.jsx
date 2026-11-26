import { useEffect, useRef, useState } from 'react';
import { MessageCircleQuestion, SendHorizontal, X } from 'lucide-react';
import { api } from '../lib/api';

// Assistant de l'espace équipe : un bouton en bas à droite ouvre la discussion.
// Il répond avec le guide des rubriques et les données que le compte connecté voit (lus par le serveur, selon ses droits).
// Il n'apparaît que si le serveur est branché à l'agent ; la discussion reste ouverte tant que l'application l'est.
const SUGGESTIONS = {
  occupant: ['Qui dois-je relancer aujourd’hui ?', 'Que manque-t-il à la fiche de mon stand ?', 'Comment enregistrer un contact ?'],
  team: ['Qu’est-ce qui attend une action aujourd’hui ?', 'Comment inviter quelqu’un au Studio ?', 'Comment créer le compte d’un gérant ?'],
  animateur: ['Comment remettre une récompense ?', 'Que faire si un joueur a perdu son code ?'],
};
const HISTORY = 8; // derniers messages renvoyés avec la question, pour que l'assistant suive le fil

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
    const history = messages.slice(-HISTORY);
    setMessages([...messages, { role: 'user', content: message }]);
    setDraft('');
    setError('');
    setLoading(true);
    try {
      const result = await api.askAssistant(token, { message, history });
      setMessages((current) => [...current, { role: 'assistant', content: result.answer }]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
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
        <p className="assistant-message is-assistant">Bonjour {user.firstName}. Posez votre question sur l’espace équipe.</p>
        {messages.length === 0 && (
          <div className="assistant-suggestions">
            {suggestions.map((item) => <button key={item} type="button" onClick={() => send(item)}>{item}</button>)}
          </div>
        )}
        {messages.map((item, index) => <p key={index} className={`assistant-message is-${item.role}`}>{item.content}</p>)}
        {loading && <p className="assistant-message is-assistant is-writing" aria-label="L’assistant écrit"><i /><i /><i /></p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <span ref={endRef} />
      </div>

      <form className="assistant-form" onSubmit={submit}>
        <input ref={inputRef} type="text" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1500} aria-label="Votre question" autoComplete="off" enterKeyHint="send" />
        <button className="button button-primary" type="submit" disabled={loading || !draft.trim()} aria-label="Envoyer" title="Envoyer"><SendHorizontal size={20} aria-hidden="true" /></button>
      </form>
    </section>
  );
}
