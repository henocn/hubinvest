import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Send } from 'lucide-react';
import PublicDialog from './PublicDialog';
import { api } from '../lib/api';
import { publicErrorMessage } from '../lib/public-error';

// Le public pose sa question pendant le direct ; elle arrive aussitôt chez l'animateur, sans entrer dans le Studio.
export default function LiveQuestionDialog({ event, onClose }) {
  const { t } = useTranslation();
  const [question, setQuestion] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (formEvent) => {
    formEvent.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.askLiveQuestion(event.id, { authorName: authorName.trim(), question: question.trim() });
      setSent(true);
    } catch (requestError) {
      setError(publicErrorMessage(t, requestError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicDialog title={t('live.ask')} onClose={onClose} locked={loading} className="live-question-dialog">
      {sent ? (
        <div className="live-question-sent" role="status">
          <CheckCircle2 size={28} aria-hidden="true" />
          <p>{t('live.sent')}</p>
          <button className="button button-secondary" type="button" onClick={() => { setSent(false); setQuestion(''); }}>{t('live.another')}</button>
        </div>
      ) : (
        <form className="player-form" onSubmit={submit}>
          <label>
            {t('live.question')}
            <textarea value={question} onChange={(changeEvent) => setQuestion(changeEvent.target.value)} rows={4} minLength={5} maxLength={500} required autoFocus />
          </label>
          <label>
            {t('live.name')}
            <input value={authorName} onChange={(changeEvent) => setAuthorName(changeEvent.target.value)} minLength={2} maxLength={80} autoComplete="name" required />
          </label>
          {error && <p className="request-error" role="alert">{error}</p>}
          <button className="button button-primary button-large" type="submit" disabled={loading || question.trim().length < 5 || authorName.trim().length < 2}>
            {loading ? t('common.sending') : t('live.send')}
            <Send size={18} />
          </button>
        </form>
      )}
    </PublicDialog>
  );
}
