import { useCallback, useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { api } from '../lib/api';
import { useRealtimeEvent } from '../../lib/realtime';
import B2bNeedsSettings from '../components/B2bNeedsSettings';
import WheelSettings from '../components/WheelSettings';
import InvestorQualificationSettings from '../components/InvestorQualificationSettings';

const modules = [
  { key: 'contactRequestsOpen', title: 'Demandes de contact aux stands' },
  { key: 'investorDeskOpen', title: 'Investor Desk' },
  { key: 'b2bOpen', title: 'Propositions B2B' },
  { key: 'challengeOpen', title: 'Défi de passage' },
  { key: 'wheelOpen', title: 'Roue des opportunités' },
  { key: 'liveQuestionsOpen', title: 'Questions en direct' },
];

// Réglages du site, appliqués aussitôt : ouvrir ou fermer chaque module, nombre de stands requis pour les Défis,
// cases et lots de la roue, besoins B2B publiés. Un administrateur de stand n'y voit que les besoins B2B de son stand.
// Un réglage chiffré ou horaire, enregistré avec son bouton ; le champ suit la valeur enregistrée.
function SettingField({ settingKey, label, hint, type, min, max, value, saving, saved, onSave }) {
  const [draft, setDraft] = useState(String(value ?? ''));
  useEffect(() => { setDraft(String(value ?? '')); }, [value]);
  const next = type === 'number' ? Number.parseInt(draft, 10) : draft;
  const valid = type === 'number' ? Number.isInteger(next) && next >= Number(min) && next <= Number(max) : /^\d{2}:\d{2}$/.test(draft);
  return (
    <form className="settings-row" onSubmit={(event) => { event.preventDefault(); if (valid && next !== value) void onSave(settingKey, next); }}>
      <span>
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </span>
      {saved === settingKey && <Check className="settings-saved" size={18} aria-label="Enregistré" />}
      <span className="settings-number">
        <input type={type} min={min} max={max} value={draft} onChange={(event) => setDraft(event.target.value)} aria-label={label} />
        <button className="button button-secondary" type="submit" disabled={saving === settingKey || !valid || next === value}>Enregistrer</button>
      </span>
    </form>
  );
}

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

          <section className="data-panel settings-panel">
            <h2>Rendez-vous B2B</h2>
            <SettingField settingKey="b2bTables" label="Nombre de tables" type="number" min="1" max="50" value={settings.b2bTables} saving={savingKey} saved={savedKey} onSave={save} />
            <SettingField settingKey="b2bMeetingMinutes" label="Durée d’un rendez-vous (minutes)" hint="20 minutes selon le document" type="number" min="5" max="120" value={settings.b2bMeetingMinutes} saving={savingKey} saved={savedKey} onSave={save} />
            <SettingField settingKey="b2bDayStart" label="Premier rendez-vous" hint="Heure de Lomé" type="time" value={settings.b2bDayStart} saving={savingKey} saved={savedKey} onSave={save} />
            <SettingField settingKey="b2bDayEnd" label="Fin des rendez-vous" hint="Le dernier rendez-vous se termine au plus tard à cette heure" type="time" value={settings.b2bDayEnd} saving={savingKey} saved={savedKey} onSave={save} />
          </section>

          <section className="data-panel settings-panel">
            <h2>Investor Desk</h2>
            <SettingField settingKey="investorDelayAHours" label="Relance d’un contact A (heures)" hint="48 heures selon le document" type="number" min="1" max="720" value={settings.investorDelayAHours} saving={savingKey} saved={savedKey} onSave={save} />
            <SettingField settingKey="investorDelayBDays" label="Relance d’un contact B (jours)" hint="7 jours selon le document" type="number" min="1" max="90" value={settings.investorDelayBDays} saving={savingKey} saved={savedKey} onSave={save} />
            <InvestorQualificationSettings fields={settings.investorQualificationFields} saving={savingKey === 'investorQualificationFields'} saved={savedKey === 'investorQualificationFields'} onSave={save} />
          </section>
        </>
      )}
      {isSuperAdmin && <WheelSettings session={session} onLogout={onLogout}>
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
      </WheelSettings>}
      <B2bNeedsSettings session={session} onLogout={onLogout} />
    </main>
  );
}
