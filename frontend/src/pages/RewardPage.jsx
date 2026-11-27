import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CircleAlert, PackageOpen } from 'lucide-react';
import Confetti from '../components/Confetti';
import { api } from '../lib/api';
import { readChallengePassportToken } from '../lib/challenge-passport-store';
import { publicErrorMessage } from '../lib/public-error';

// Heure qui défile à la seconde : l'équipe voit que l'écran est vivant, pas une capture.
function LiveClock({ since }) {
  const { i18n } = useTranslation();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const locale = i18n.resolvedLanguage?.startsWith('en') ? 'en-GB' : 'fr-FR';
  const time = new Intl.DateTimeFormat(locale, { timeZone: 'Africa/Lome', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(now);
  const seconds = Math.max(0, Math.round((now - since) / 1000));
  return <p className="reward-clock"><span>{time}</span><small>{seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min`}</small></p>;
}

// Page ouverte par le QR du comptoir (Stand API-ZF) : la récompense du Défi (cinquième étape) et les lots gagnés à la
// roue sont marqués récupérés, et l'écran, vert et vivant, liste ce que l'équipe remet. Un second scan affiche en rouge
// l'heure de la dernière récupération.
export default function RewardPage({ sig }) {
  const { t, i18n } = useTranslation();
  const [player] = useState(() => readChallengePassportToken());
  const [state, setState] = useState(player ? { status: 'loading' } : { status: 'identify' });

  useEffect(() => {
    if (!player) return undefined;
    let active = true;
    api.claimReward({ player, sig })
      .then((result) => { if (active) { navigator.vibrate?.([80, 50, 80, 50, 160]); setState({ status: 'claimed', result, at: new Date() }); } })
      .catch((error) => {
        if (!active) return;
        const at = error.details?.redeemedAt ? new Date(error.details.redeemedAt) : null;
        // Récupérée il y a quelques secondes (page rechargée, double chargement) : c'est la même remise, l'écran reste vert.
        if (error.code === 'REWARD_ALREADY_REDEEMED' && at && Date.now() - at.getTime() < 15_000) {
          setState({ status: 'claimed', result: { displayName: error.details?.displayName || '', items: [] }, at });
        } else if (error.code === 'REWARD_ALREADY_REDEEMED') setState({ status: 'already', at });
        else if (error.code === 'CHALLENGE_NOT_COMPLETED') setState({ status: 'incomplete' });
        else if (error.code === 'CHALLENGE_PLAYER_REQUIRED') setState({ status: 'identify' });
        else setState({ status: 'error', message: publicErrorMessage(t, error) });
      });
    return () => { active = false; };
  }, [player, sig, t]);

  const locale = i18n.resolvedLanguage?.startsWith('en') ? 'en-GB' : 'fr-FR';
  const when = (date) => new Intl.DateTimeFormat(locale, { timeZone: 'Africa/Lome', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(date);

  if (state.status === 'claimed') {
    return (
      <main className="reward-page is-claimed" role="status">
        <Confetti />
        <span className="reward-box" aria-hidden="true"><PackageOpen size={84} strokeWidth={1.6} /></span>
        <p className="reward-name">{state.result.displayName}</p>
        <h1>{t('reward.claimed')}</h1>
        {state.result.items.length > 0 && (
          <ul className="reward-items">
            {state.result.items.map((item, index) => <li key={index}>{item.kind === 'reward' ? t('reward.challengeReward') : t('reward.wheelPrize', { label: item.label })}</li>)}
          </ul>
        )}
        <p>{t('reward.show')}</p>
        <LiveClock since={state.at} />
      </main>
    );
  }

  if (state.status === 'already') {
    return (
      <main className="reward-page is-already" role="status">
        <span className="reward-box" aria-hidden="true"><CircleAlert size={72} strokeWidth={1.8} /></span>
        <h1>{t('reward.already')}</h1>
        {state.at && <p>{t('reward.alreadyAt', { when: when(state.at) })}</p>}
      </main>
    );
  }

  return (
    <main className="public-container reward-page-plain">
      {state.status === 'loading' && <p className="public-message">{t('reward.loading')}</p>}
      {state.status === 'identify' && <p className="public-message">{t('reward.identify')} <Link to="/defis">{t('passage.seeRoute')}</Link></p>}
      {state.status === 'incomplete' && <p className="public-message">{t('reward.incomplete')} <Link to="/defis">{t('passage.seeRoute')}</Link></p>}
      {state.status === 'error' && <p className="public-message is-error">{state.message}</p>}
    </main>
  );
}
