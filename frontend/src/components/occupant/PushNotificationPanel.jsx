import { Bell, BellOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import {
  currentPushSubscription,
  disablePush,
  enablePush,
  isPushSupported,
  needsHomeScreenInstall,
} from '../../lib/push';

// Permet d'activer ou couper les notifications push de cet appareil.
export default function PushNotificationPanel({ token }) {
  const [state, setState] = useState('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    // Détermine l'état initial et rattache un abonnement existant au compte connecté.
    const load = async () => {
      if (!isPushSupported()) return needsHomeScreenInstall() ? 'install' : 'hidden';
      const { enabled } = await api.pushPublicKey();
      if (!enabled) return 'hidden';
      if (Notification.permission === 'denied') return 'denied';
      const subscription = await currentPushSubscription();
      if (subscription && Notification.permission === 'granted') {
        await api.subscribePush(token, subscription.toJSON()).catch(() => {});
        return 'on';
      }
      return 'off';
    };
    load()
      .then((next) => { if (active) setState(next); })
      .catch(() => { if (active) setState('hidden'); });
    return () => { active = false; };
  }, [token]);

  // Bascule l'abonnement de l'appareil.
  const toggle = async () => {
    setBusy(true);
    setError('');
    try {
      if (state === 'on') {
        await disablePush(token);
        setState('off');
      } else {
        await enablePush(token);
        setState('on');
      }
    } catch (requestError) {
      if (Notification.permission === 'denied') setState('denied');
      else setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  if (state === 'loading' || state === 'hidden') return null;

  return (
    <section className="occupant-notification-panel" aria-label="Notifications">
      <div>
        <h2>Notifications</h2>
        {state === 'install' && <p>Ajoutez HubInvest à l’écran d’accueil pour recevoir les notifications.</p>}
        {state === 'denied' && <p>Les notifications sont bloquées dans les réglages du navigateur.</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
      {(state === 'on' || state === 'off') && (
        <button className="button button-secondary" type="button" onClick={toggle} disabled={busy}>
          {state === 'on' ? <BellOff size={18} /> : <Bell size={18} />}
          {state === 'on' ? 'Désactiver' : 'Activer'}
        </button>
      )}
    </section>
  );
}
