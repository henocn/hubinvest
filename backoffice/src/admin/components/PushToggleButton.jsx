import { Bell, BellOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { currentPushSubscription, disablePush, enablePush, isPushSupported, PUSH_CHANGED } from '../../lib/push';

const labels = {
  on: 'Désactiver les notifications',
  off: 'Activer les notifications',
  denied: 'Notifications bloquées par le navigateur',
};

// Bouton icône qui active ou coupe les notifications push de cet appareil.
export default function PushToggleButton({ token }) {
  const [state, setState] = useState('hidden');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    // Détermine l'état initial et rattache un abonnement existant au compte connecté.
    const load = async () => {
      if (!isPushSupported()) return 'hidden';
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
    const refresh = () => load()
      .then((next) => { if (active) setState(next); })
      .catch(() => { if (active) setState('hidden'); });
    void refresh();
    window.addEventListener(PUSH_CHANGED, refresh);
    return () => {
      active = false;
      window.removeEventListener(PUSH_CHANGED, refresh);
    };
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

  if (state === 'hidden') return null;
  const label = error || labels[state];

  return (
    <button
      className={`admin-icon-button${state === 'on' ? ' is-active' : ''}`}
      type="button"
      onClick={toggle}
      disabled={busy || state === 'denied'}
      aria-label={label}
      title={label}
    >
      {state === 'on' ? <Bell size={18} /> : <BellOff size={18} />}
    </button>
  );
}
