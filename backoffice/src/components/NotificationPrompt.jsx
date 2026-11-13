import { useEffect, useState } from 'react';
import { Bell, BellOff, Smartphone } from 'lucide-react';
import { api } from '../lib/api';
import { currentPushSubscription, enablePush, isPushSupported, needsHomeScreenInstall, PUSH_CHANGED } from '../lib/push';

const DISMISS_KEY = 'hubinvest-notification-prompt';

const copy = {
  ask: { Icon: Bell, title: 'Activer les notifications', text: 'Pour ne rien manquer.' },
  denied: { Icon: BellOff, title: 'Notifications bloquées', text: 'Autorisez-les avec le cadenas à côté de l’adresse.' },
  install: { Icon: Smartphone, title: 'Installer HubInvest', text: 'Partager, puis « Sur l’écran d’accueil ».' },
};

// Tant que cet appareil ne reçoit pas les notifications, propose de les activer à chaque ouverture de l'espace.
// « Plus tard » ne masque la fenêtre que jusqu'à la prochaine ouverture.
export default function NotificationPrompt({ token }) {
  const [mode, setMode] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const decide = async () => {
      try {
        if (sessionStorage.getItem(DISMISS_KEY)) return null;
      } catch {
        // Stockage indisponible : on propose quand même.
      }
      if (!isPushSupported()) return needsHomeScreenInstall() ? 'install' : null;
      const { enabled } = await api.pushPublicKey();
      if (!enabled) return null;
      if (Notification.permission === 'denied') return 'denied';
      if (Notification.permission === 'granted') {
        // Déjà autorisé (par exemple au clic sur « Se connecter ») : on abonne l'appareil sans rien demander.
        if (!await currentPushSubscription()) {
          await enablePush(token);
          window.dispatchEvent(new Event(PUSH_CHANGED));
        }
        return null;
      }
      return 'ask';
    };
    decide()
      .then((next) => { if (active) setMode(next); })
      .catch(() => { if (active) setMode(null); });
    return () => { active = false; };
  }, [token]);

  const later = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Sans stockage, la fenêtre reviendra simplement à la prochaine page chargée.
    }
    setMode(null);
  };

  const activate = async () => {
    setBusy(true);
    setError('');
    try {
      await enablePush(token);
      window.dispatchEvent(new Event(PUSH_CHANGED));
      setMode(null);
    } catch (requestError) {
      if (Notification.permission === 'denied') setMode('denied');
      else setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  if (!mode) return null;
  const { Icon, title, text } = copy[mode];

  return (
    <div className="notification-prompt-backdrop">
      <section className="notification-prompt" role="dialog" aria-modal="true" aria-labelledby="notification-prompt-title">
        <span className="notification-prompt-icon"><Icon size={24} aria-hidden="true" /></span>
        <h2 id="notification-prompt-title">{title}</h2>
        <p>{text}</p>
        {error && <p className="form-error">{error}</p>}
        <div className="notification-prompt-actions">
          {mode === 'ask' && (
            <button className="button button-primary" type="button" onClick={activate} disabled={busy}>
              {busy ? 'Activation…' : 'Activer'}
            </button>
          )}
          <button className="button button-secondary" type="button" onClick={later} disabled={busy}>
            {mode === 'ask' ? 'Plus tard' : 'Compris'}
          </button>
        </div>
      </section>
    </div>
  );
}
