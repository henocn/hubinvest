import { useCallback, useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { api } from '../lib/api';
import { useRealtimeEvent } from '../../lib/realtime';

const modules = [
  { key: 'contactRequestsOpen', title: 'Demandes de contact aux stands', text: 'Formulaire « Être recontacté » des fiches de stand.' },
  { key: 'investorDeskOpen', title: 'Investor Desk', text: 'Dépôt de nouveaux projets.' },
  { key: 'b2bOpen', title: 'Propositions B2B', text: 'Réponses des visiteurs aux besoins publiés.' },
  { key: 'challengeOpen', title: 'Défis', text: 'Inscription des joueurs et scans sur les stands.' },
  { key: 'wheelOpen', title: 'Roue des opportunités', text: 'Codes de jeu et tirages.' },
];

// Réglages du site, appliqués aussitôt : ouvrir ou fermer chaque module, nombre de stands requis pour les Défis.
export default function SettingsPage({ session, onLogout }) {
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState('');
  const [savingKey, setSavingKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [passages, setPassages] = useState('');
  const [playsPerDay, setPlaysPerDay] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api.settings(session.token);
      setSettings(data);
      setPassages(String(data.requiredPassages));
      setPlaysPerDay(String(data.wheelPlaysPerDay));
    } catch (requestError) {
      if (requestError.status === 401 || requestError.status === 403) onLogout();
      else setError(requestError.message);
    }
  }, [onLogout, session.token]);

  useEffect(() => { void load(); }, [load]);
  useRealtimeEvent('settings', () => { void load(); });

  const save = async (key, value) => {
    setSavingKey(key);
    setError('');
    try {
      const data = await api.updateSettings(session.token, { [key]: value });
      setSettings(data);
      setPassages(String(data.requiredPassages));
      setPlaysPerDay(String(data.wheelPlaysPerDay));
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

  return (
    <main className="admin-workspace">
      <header className="workspace-header">
        <div><h1>Paramètres</h1><p>Chaque changement s’applique aussitôt sur le site.</p></div>
      </header>
      {error && <p className="admin-form-error">{error}</p>}
      {!settings && !error && <p className="panel-message">Chargement…</p>}
      {settings && (
        <>
          <section className="data-panel settings-panel">
            <h2>Modules ouverts au public</h2>
            {modules.map(({ key, title, text }) => (
              <label className="settings-row" key={key}>
                <span>
                  <strong>{title}</strong>
                  <small>{settings[key] ? text : 'Fermé : le site affiche un message à la place.'}</small>
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
            <h2>Défis et roue</h2>
            <form className="settings-row" onSubmit={savePassages}>
              <span>
                <strong>Stands à visiter pour terminer le parcours</strong>
                <small>Un parcours déjà terminé le reste.</small>
              </span>
              {savedKey === 'requiredPassages' && <Check className="settings-saved" size={18} aria-label="Enregistré" />}
              <span className="settings-number">
                <input type="number" min="1" max="50" value={passages} onChange={(event) => setPassages(event.target.value)} aria-label="Nombre de stands" />
                <button className="button button-secondary" type="submit" disabled={savingKey === 'requiredPassages' || Number(passages) === settings.requiredPassages}>Enregistrer</button>
              </span>
            </form>
            <form className="settings-row" onSubmit={savePlaysPerDay}>
              <span>
                <strong>Parties de roue par personne et par jour</strong>
                <small>0 = sans limite. Le code d’un joueur qui a atteint la limite reste valable pour quelqu’un d’autre.</small>
              </span>
              {savedKey === 'wheelPlaysPerDay' && <Check className="settings-saved" size={18} aria-label="Enregistré" />}
              <span className="settings-number">
                <input type="number" min="0" max="20" value={playsPerDay} onChange={(event) => setPlaysPerDay(event.target.value)} aria-label="Parties par jour" />
                <button className="button button-secondary" type="submit" disabled={savingKey === 'wheelPlaysPerDay' || Number(playsPerDay) === settings.wheelPlaysPerDay}>Enregistrer</button>
              </span>
            </form>
          </section>
        </>
      )}
    </main>
  );
}
