import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, MessageSquare, RotateCcw, Stamp } from 'lucide-react';
import Confetti from '../components/Confetti';
import ContactRequestForm from '../components/ContactRequestForm';
import PlayerIdentifyDialog from '../components/PlayerIdentifyDialog';
import PublicDialog from '../components/PublicDialog';
import { api, resolveAssetUrl } from '../lib/api';
import { clearChallengePassportToken, readChallengePassportToken, saveChallengePassportToken } from '../lib/challenge-passport-store';
import { publicErrorMessage } from '../lib/public-error';
import { useSiteSettings } from '../lib/settings';

// Compte à rebours en secondes, pour « Réessayer dans 30 s ».
function useCountdown(seconds) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    setLeft(seconds);
    if (!seconds) return undefined;
    const timer = window.setInterval(() => setLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [seconds]);
  return left;
}

// Les deux questions, l'une après l'autre : un toucher par réponse, puis le résultat.
function QuizDialog({ quiz, player, onClose, onRetry }) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const retryLeft = useCountdown(result?.retryIn || 0);
  const question = quiz.questions[index];

  const choose = async (optionIndex) => {
    const next = [...answers, optionIndex];
    setAnswers(next);
    if (next.length < quiz.questions.length) {
      setIndex(next.length);
      return;
    }
    setBusy(true);
    try {
      const data = await api.passageAnswer({ ticket: quiz.ticket, player, answers: next });
      if (data.correct) {
        const passport = await api.publicChallengePassport(player).catch(() => null);
        navigator.vibrate?.([50, 40, 90]);
        setResult({ correct: true, passport });
      } else {
        setResult({ correct: false, retryIn: data.retryIn });
      }
    } catch (requestError) {
      setError(publicErrorMessage(t, requestError));
      setResult({ correct: false, retryIn: requestError.details?.retryIn || 0, failed: true });
    } finally {
      setBusy(false);
    }
  };

  if (result?.correct) {
    const passport = result.passport;
    return (
      <PublicDialog title={quiz.stand.name} onClose={onClose} className="passage-dialog">
        <div className="passage-success" role="status">
          <Confetti />
          <span className="passage-stamp" aria-hidden="true"><Stamp size={46} /></span>
          <strong>{t('passage.validated')}</strong>
          {passport && <p>{passport.status === 'completed' ? t('passage.allFound') : t('passage.progress', { count: passport.passageCount, total: passport.requiredPassages })}</p>}
          <Link className="button button-primary" to="/defis">{passport?.status === 'completed' ? t('passage.claimNow') : t('passage.seeRoute')}</Link>
        </div>
      </PublicDialog>
    );
  }

  if (result) {
    return (
      <PublicDialog title={quiz.stand.name} onClose={onClose} className="passage-dialog">
        <div className="passage-miss" role="status">
          <strong>{result.failed ? error : t('passage.missed')}</strong>
          {!result.failed && <p>{t('passage.missedHint')}</p>}
          {retryLeft > 0
            ? <p className="passage-wait">{t('passage.retryIn', { count: retryLeft })}</p>
            : <button className="button button-primary" type="button" onClick={onRetry}><RotateCcw size={17} aria-hidden="true" />{t('passage.retry')}</button>}
        </div>
      </PublicDialog>
    );
  }

  return (
    <PublicDialog title={quiz.stand.name} onClose={onClose} locked={busy} className="passage-dialog">
      <div className="passage-quiz" key={index}>
        <span className="passage-step">{t('passage.question', { count: index + 1, total: quiz.questions.length })}</span>
        <h3>{t(`passage.ask.${question.kind}`)}</h3>
        <ul>
          {question.options.map((option, optionIndex) => (
            <li key={`${index}-${optionIndex}`} style={{ '--i': optionIndex }}>
              <button type="button" className={option ? '' : 'is-none'} disabled={busy} onClick={() => choose(optionIndex)}>
                {option || t('passage.none')}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </PublicDialog>
  );
}

// Page ouverte par le QR posé devant un stand : prendre contact, ou valider son passage du Défi en deux questions.
export default function PassagePage({ slug, sig }) {
  const { t } = useTranslation();
  const settings = useSiteSettings();
  const [stand, setStand] = useState(null);
  const [player, setPlayer] = useState(() => readChallengePassportToken());
  const [identifying, setIdentifying] = useState(false);
  const [contacting, setContacting] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const waitLeft = useCountdown(notice?.retryIn || 0);

  useEffect(() => {
    let active = true;
    api.publicOccupant(slug).then((data) => { if (active) setStand(data); }).catch(() => {});
    return () => { active = false; };
  }, [slug]);

  const startQuiz = useCallback(async (token) => {
    setLoading(true);
    setNotice(null);
    setQuiz(null);
    try {
      const data = await api.passageQuiz({ slug, sig, player: token });
      if (data.status === 'ready') setQuiz(data);
      else setNotice({ status: data.status, retryIn: data.retryIn || 0 });
    } catch (requestError) {
      if (requestError.code === 'CHALLENGE_PLAYER_REQUIRED') {
        clearChallengePassportToken();
        setPlayer('');
        setIdentifying(true);
      } else {
        setNotice({ status: 'error', message: publicErrorMessage(t, requestError) });
      }
    } finally {
      setLoading(false);
    }
  }, [sig, slug, t]);

  const validatePassage = () => {
    if (!player) setIdentifying(true);
    else startQuiz(player);
  };

  const identified = (data) => {
    saveChallengePassportToken(data.token);
    setPlayer(data.token);
    setIdentifying(false);
    startQuiz(data.token);
  };

  const image = stand?.coverImageUrl || stand?.logoUrl;
  const isApizf = notice?.status === 'apizf';

  return (
    <main className="public-container passage-page">
      <section className="passage-card">
        <div className="passage-cover">{image ? <img src={resolveAssetUrl(image)} alt="" /> : <span aria-hidden="true" />}</div>
        <div className="passage-body">
          <h1>{stand?.name || '…'}</h1>
          {stand?.standLabel && <p className="passage-place"><MapPin size={15} aria-hidden="true" />{stand.standLabel}</p>}
          <div className="passage-actions">
            {settings.challengeOpen !== false && !isApizf && (
              <button className="button button-primary button-large passage-go" type="button" onClick={validatePassage} disabled={loading}>
                <Stamp size={20} aria-hidden="true" />{loading ? t('passage.loading') : t('passage.validate')}
              </button>
            )}
            {stand && settings.contactRequestsOpen !== false && (
              <button className="button button-secondary button-large" type="button" onClick={() => setContacting(true)}>
                <MessageSquare size={19} aria-hidden="true" />{t('contact.title')}
              </button>
            )}
          </div>
          {notice && (
            <p className={`passage-notice is-${notice.status}`} role="status">
              {notice.status === 'error' ? notice.message
                : notice.status === 'wait' ? t('passage.retryIn', { count: waitLeft })
                  : t(`passage.status.${notice.status}`)}
              {['completed', 'redeemed', 'done'].includes(notice.status) && <> <Link to="/defis">{t('passage.seeRoute')}</Link></>}
            </p>
          )}
        </div>
      </section>

      {identifying && <PlayerIdentifyDialog onClose={() => setIdentifying(false)} onIdentified={identified} />}
      {contacting && stand && <ContactRequestForm stand={stand} onClose={() => setContacting(false)} />}
      {quiz && <QuizDialog quiz={quiz} player={player} onClose={() => setQuiz(null)} onRetry={() => startQuiz(player)} />}
    </main>
  );
}
