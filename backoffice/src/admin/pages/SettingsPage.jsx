import { useCallback, useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { api } from '../lib/api';
import { useRealtimeEvent } from '../../lib/realtime';
import B2bNeedsSettings from '../components/B2bNeedsSettings';
import WheelSettings from '../components/WheelSettings';

const modules = [
  { key: 'contactRequestsOpen', title: 'Demandes de contact aux stands' },
  { key: 'investorDeskOpen', title: 'Investor Desk' },
  { key: 'b2bOpen', title: 'Propositions B2B' },
  { key: 'challengeOpen', title: 'Défi de passage' },
  { key: 'wheelOpen', title: 'Roue des opportunités' },
  { key: 'liveQuestionsOpen', title: 'Questions en direct' },
];

// Réglages du site, appliqués aussitôt : ouvrir ou fermer chaque module, nombre de stands requis pour les Défis,
// cases et lots de la roue, besoins B2B publiés. Un administrateur de stand n'y voit pas les réglages généraux.
export default function SettingsPage({ session, onLogout }) {
  const isSuperAdmin = session.user.role === 'super-admin';
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState('');
  const [savingKey, setSavingKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [passages, setPassages] = useState('');
  const [playsPerDay, setPlaysPerDay] = useState('');
  const [spinsPerCode, setSpinsPerCode] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api.settings(session.token);
      setSettings(data);
      setPassages(String(data.requiredPassages));
      setPlaysPerDay(String(data.wheelPlaysPerDay));
      setSpinsPerCode(String(data.wheelSpinsPerCode));
    } catch (requestError) {
      if (requestError.status === 401 || requestError.status === 403) onLogout();
      else setError(requestError.message);
    }
  }, [onLogout, session.token]);

  useEffect(() => { if (isSuperAdmin) void load(); }, [isSuperAdmin, load]);
  useRealtimeEvent('settings', () => { if (isSuperAdmin) void load(); });

  const save = async (key, value) => {
    setSavingKey(key);
    setError('');
    try {
      const data = await api.updateSettings(session.token, { [key]: value });
      setSettings(data);
      setPassages(String(data.requiredPassages));
      setPlaysPerDay(String(data.wheelPlaysPerDay));
      setSpinsPerCode(String(data.wheelSpinsPerCode));
      setSavedKey(key);
      window.setTimeout(() => setSavedKey((current) => (current === key ? '' : current)), 1800);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingKey('');
    }
  };

  const savePassages = (event) => {
    event.preventDefault();
    const value = Number.parseInt(passages, 10);
    if (Number.isInteger(value) && value >= 1 && value !== settings.requiredPassages) void save('requiredPassages', value);
  };

  const savePlaysPerDay = (event) => {
    event.preventDefault();
    const value = Number.parseInt(playsPerDay, 10);
    if (Number.isInteger(value) && value >= 0 && value !== settings.wheelPlaysPerDay) void save('wheelPlaysPerDay', value);
  };

  const saveSpinsPerCode = (event) => {
    event.preventDefault();
    const value = Number.parseInt(spinsPerCode, 10);
    if (Number.isInteger(value) && value >= 1 && value !== settings.wheelSpinsPerCode) void save('wheelSpinsPerCode', value);
  };

  return (
    <main className="admin-workspace">
      <header className="workspace-header"><h1>Paramètres</h1></header>
      {error && <p className="admin-form-error">{error}</p>}
      {isSuperAdmin && !settings && !error && <p className="panel-message">Chargement…</p>}
      {settings && (
        <>
          <section className="data-panel settings-panel">
            <h2>Modules ouverts au public</h2>
            {modules.map(({ key, title }) => (
              <label className="settings-row" key={key}>
                <span>
                  <strong>{title}</strong>
                  {!settings[key] && <small>Fermé</small>}
                </span>
                {savedKey === key && <Check className="settings-saved" size={18} aria-label="Enregistré" />}
                <input
                  className="settings-switch"
                  type="checkbox"
                  role="switch"
                  checked={Boolean(settings[key])}
                  disabled={savingKey === key}
                  onChange={(event) => save(key, event.target.checked)}
                />
              </label>
            ))}
          </section>

          <section className="data-panel settings-panel">
            <h2>Défi de passage</h2>
            <form className="settings-row" onSubmit={savePassages}>
              <span>
                <strong>Stands à visiter pour terminer le parcours</strong>
              </span>
              {savedKey === 'requiredPassages' && <Check className="settings-saved" size={18} aria-label="Enregistré" />}
              <span className="settings-number">
                <input type="number" min="1" max="50" value={passages} onChange={(event) => setPassages(event.target.value)} aria-label="Nombre de stands" />
                <button className="button button-secondary" type="submit" disabled={savingKey === 'requiredPassages' || Number(passages) === settings.requiredPassages}>Enregistrer</button>
              </span>
            </form>
          </section>
        </>
      )}
      <WheelSettings session={session} onLogout={onLogout}>
        {settings && (
          <form className="settings-row" onSubmit={saveSpinsPerCode}>
            <span>
              <strong>Tours de roue par code de jeu</strong>
              <small>Un code n’expire pas ; il sert jusqu’à son dernier tour</small>
            </span>
            {savedKey === 'wheelSpinsPerCode' && <Check className="settings-saved" size={18} aria-label="Enregistré" />}
            <span className="settings-number">
              <input type="number" min="1" max="20" value={spinsPerCode} onChange={(event) => setSpinsPerCode(event.target.value)} aria-label="Tours par code" />
              <button className="button button-secondary" type="submit" disabled={savingKey === 'wheelSpinsPerCode' || Number(spinsPerCode) === settings.wheelSpinsPerCode}>Enregistrer</button>
            </span>
          </form>
        )}
        {settings && (
          <form className="settings-row" onSubmit={savePlaysPerDay}>
            <span>
              <strong>Parties de roue par personne et par jour</strong>
              <small>0 = sans limite</small>
            </span>
            {savedKey === 'wheelPlaysPerDay' && <Check className="settings-saved" size={18} aria-label="Enregistré" />}
            <span className="settings-number">
              <input type="number" min="0" max="20" value={playsPerDay} onChange={(event) => setPlaysPerDay(event.target.value)} aria-label="Parties par jour" />
              <button className="button button-secondary" type="submit" disabled={savingKey === 'wheelPlaysPerDay' || Number(playsPerDay) === settings.wheelPlaysPerDay}>Enregistrer</button>
            </span>
          </form>
        )}
      </WheelSettings>
      <B2bNeedsSettings session={session} onLogout={onLogout} />
    </main>
  );
}
