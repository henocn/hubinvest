import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Clock3,
  Cloud,
  CloudOff,
  Eye,
  EyeOff,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  UserRound,
} from 'lucide-react';
import logo from '../../assets/Logo fond blanc.jpeg';
import { api } from './lib/api';
import {
  listStoredContacts,
  mergeServerContacts,
  queueContact,
  syncPendingContacts,
} from './lib/contact-store';

const qualificationLabels = {
  hot: 'Chaud',
  warm: 'Tiede',
  cold: 'Froid',
};

function ConnectionState({ online }) {
  return (
    <span className={`connection-state ${online ? 'is-online' : 'is-offline'}`}>
      {online ? <Cloud size={16} /> : <CloudOff size={16} />}
      {online ? 'API disponible' : 'API indisponible'}
    </span>
  );
}

function PasswordInput(props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <input {...props} type={visible ? 'text' : 'password'} />
      <button type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
        {visible ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
    </div>
  );
}

function LoginScreen({ apiOnline, onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await onLogin(form);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-brand">
        <img src={logo} alt="API-ZF" />
        <div>
          <strong>HubInvest</strong>
          <span>Espace occupant</span>
        </div>
      </section>

      <section className="login-panel">
        <ConnectionState online={apiOnline} />
        <div className="login-copy">
          <h1>Connexion</h1>
          <p>Accedez aux contacts de votre stand.</p>
        </div>

        <form onSubmit={submit} className="form-stack">
          <label>
            Adresse e-mail
            <input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              required
            />
          </label>
          <label>
            Mot de passe
            <PasswordInput
              autoComplete="current-password"
              minLength={8}
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="button button-primary button-large" type="submit" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </section>
    </main>
  );
}

function ContactForm({ onCancel, onCreated }) {
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    company: '',
    need: '',
    qualification: 'cold',
    nextAction: '',
    nextActionAt: '',
    consentOccupant: false,
    consentApizf: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const field = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await onCreated({
        ...form,
        id: crypto.randomUUID(),
        nextActionAt: form.nextActionAt || null,
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="workspace contact-form-view">
      <button type="button" className="back-button" onClick={onCancel}>
        <ArrowLeft size={18} />
        Mes contacts
      </button>
      <div className="page-heading">
        <h1>Nouveau contact</h1>
        <p>Les informations utiles pour assurer la prochaine action.</p>
      </div>

      <form className="form-stack" onSubmit={submit}>
        <label>
          Nom complet
          <input value={form.fullName} onChange={(event) => field('fullName', event.target.value)} required />
        </label>
        <label>
          Numero de telephone
          <input
            type="tel"
            inputMode="tel"
            value={form.phone}
            onChange={(event) => field('phone', event.target.value)}
            required
          />
        </label>
        <label>
          Entreprise
          <input value={form.company} onChange={(event) => field('company', event.target.value)} />
        </label>
        <label>
          Ce que la personne recherche
          <textarea value={form.need} onChange={(event) => field('need', event.target.value)} rows={3} />
        </label>
        <fieldset>
          <legend>Qualification</legend>
          <div className="qualification-options">
            {Object.entries(qualificationLabels).map(([value, label]) => (
              <label key={value} className={`qualification-option ${value}`}>
                <input
                  type="radio"
                  name="qualification"
                  value={value}
                  checked={form.qualification === value}
                  onChange={() => field('qualification', value)}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <label>
          Prochaine action
          <input value={form.nextAction} onChange={(event) => field('nextAction', event.target.value)} />
        </label>
        <label>
          Date de la prochaine action
          <input
            type="datetime-local"
            value={form.nextActionAt}
            onChange={(event) => field('nextActionAt', event.target.value)}
          />
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={form.consentOccupant}
            onChange={(event) => field('consentOccupant', event.target.checked)}
            required
          />
          <span>La personne accepte d'etre recontactee par cet occupant.</span>
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={form.consentApizf}
            onChange={(event) => field('consentApizf', event.target.checked)}
          />
          <span>La personne accepte de recevoir les informations de l'API-ZF.</span>
        </label>

        {error && <p className="form-error">{error}</p>}

        <div className="form-actions">
          <button type="button" className="button button-secondary" onClick={onCancel}>
            Annuler
          </button>
          <button type="submit" className="button button-primary" disabled={loading}>
            {loading ? 'Enregistrement...' : 'Enregistrer le contact'}
          </button>
        </div>
      </form>
    </section>
  );
}

function ContactsScreen({ session, apiOnline, setApiOnline, onLogout }) {
  const [view, setView] = useState('list');
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const occupantId = session.user.occupantId;

  const readLocal = useCallback(async () => {
    const stored = await listStoredContacts(occupantId);
    setContacts(stored);
    return stored;
  }, [occupantId]);

  const sync = useCallback(async () => {
    setError('');

    if (!navigator.onLine) {
      setApiOnline(false);
      await readLocal();
      setLoading(false);
      return;
    }

    try {
      await syncPendingContacts(occupantId, (contact) => api.createContact(session.token, contact));
      const contactData = await api.contacts(session.token);
      await mergeServerContacts(occupantId, contactData.items);
      await readLocal();
      setApiOnline(true);
    } catch (requestError) {
      if (requestError.status === 401 || requestError.status === 403) {
        onLogout();
        return;
      }
      if (!requestError.status) setApiOnline(false);
      setError(requestError.message);
      await readLocal();
    } finally {
      setLoading(false);
    }
  }, [occupantId, onLogout, readLocal, session.token, setApiOnline]);

  useEffect(() => {
    let active = true;
    listStoredContacts(occupantId).then((stored) => {
      if (!active) return;
      setContacts(stored);
      setLoading(false);
    });
    return () => { active = false; };
  }, [occupantId]);

  useEffect(() => {
    if (apiOnline) sync();
  }, [apiOnline, sync]);

  const createContact = async (values) => {
    await queueContact(occupantId, values);
    await readLocal();
    setView('list');
    if (apiOnline) sync();
  };

  if (view === 'new') {
    return <ContactForm onCancel={() => setView('list')} onCreated={createContact} />;
  }

  const filteredContacts = contacts.filter((contact) => {
    const value = search.toLowerCase();
    return [contact.fullName, contact.phone, contact.company]
      .filter(Boolean)
      .some((item) => item.toLowerCase().includes(value));
  });

  const stats = contacts.reduce((result, contact) => {
    result.total += 1;
    result.byQualification[contact.qualification] += 1;
    return result;
  }, { total: 0, byQualification: { hot: 0, warm: 0, cold: 0 } });
  const pendingCount = contacts.filter((contact) => contact.syncStatus !== 'synced').length;

  return (
    <>
      <header className="app-header">
        <div className="brand-name">HubInvest</div>
        <ConnectionState online={apiOnline} />
        <button className="icon-button" type="button" onClick={onLogout} aria-label="Se deconnecter">
          <LogOut size={20} />
        </button>
      </header>

      <main className="workspace">
        <div className="page-heading heading-with-action">
          <div>
            <h1>Mes contacts</h1>
            <p>{session.user.occupant?.name || `${session.user.firstName} ${session.user.lastName}`}</p>
          </div>
          <button className="button button-primary" type="button" onClick={() => setView('new')}>
            <Plus size={20} />
            Nouveau contact
          </button>
        </div>

        <section className="metric-strip" aria-label="Contacts par qualification">
          <div><strong>{stats.total}</strong><span>Total</span></div>
          <div><strong>{stats.byQualification.hot}</strong><span>Chauds</span></div>
          <div><strong>{stats.byQualification.warm}</strong><span>Tiedes</span></div>
          <div><strong>{stats.byQualification.cold}</strong><span>Froids</span></div>
        </section>

        <div className="list-toolbar">
          <label className="search-field">
            <Search size={18} />
            <input
              aria-label="Rechercher un contact"
              placeholder="Rechercher"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <button className="button button-secondary button-compact" type="button" onClick={sync} disabled={loading}>
            <RefreshCw size={17} />
            Synchroniser
          </button>
        </div>

        {pendingCount > 0 && (
          <p className="pending-count">{pendingCount} contact{pendingCount > 1 ? 's' : ''} a synchroniser</p>
        )}

        {error && <p className="panel-error">{error}</p>}
        {loading && <p className="empty-state">Chargement des contacts...</p>}
        {!loading && !error && filteredContacts.length === 0 && (
          <div className="empty-state">
            <UserRound size={28} />
            <strong>Aucun contact</strong>
            <span>Enregistrez la premiere personne rencontree sur le stand.</span>
          </div>
        )}

        {!loading && filteredContacts.length > 0 && (
          <div className="contact-list">
            {filteredContacts.map((contact) => (
              <article className="contact-row" key={contact.id}>
                <div className="contact-avatar">{contact.fullName.slice(0, 1).toUpperCase()}</div>
                <div className="contact-main">
                  <strong>{contact.fullName}</strong>
                  <span>{contact.company || contact.phone}</span>
                  {contact.nextAction && (
                    <span className="next-action">Prochaine action : {contact.nextAction}</span>
                  )}
                  <small className={`sync-status ${contact.syncStatus || 'synced'}`}>
                    {contact.syncStatus === 'pending' && <Clock3 size={13} />}
                    {contact.syncStatus === 'syncing' && <RefreshCw size={13} />}
                    {(contact.syncStatus === 'synced' || !contact.syncStatus) && <Cloud size={13} />}
                    {contact.syncStatus === 'pending' && 'A synchroniser'}
                    {contact.syncStatus === 'syncing' && 'Synchronisation'}
                    {(contact.syncStatus === 'synced' || !contact.syncStatus) && 'Synchronise'}
                  </small>
                </div>
                <span className={`qualification-label ${contact.qualification}`}>
                  <Check size={14} />
                  {qualificationLabels[contact.qualification]}
                </span>
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

export default function App() {
  const [session, setSession] = useState(() => {
    try {
      const stored = localStorage.getItem('hubinvest-session');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [apiOnline, setApiOnline] = useState(false);

  useEffect(() => {
    const checkApi = () => {
      if (!navigator.onLine) {
        setApiOnline(false);
        return;
      }
      api.health().then(() => setApiOnline(true)).catch(() => setApiOnline(false));
    };

    checkApi();
    window.addEventListener('online', checkApi);
    window.addEventListener('offline', checkApi);
    return () => {
      window.removeEventListener('online', checkApi);
      window.removeEventListener('offline', checkApi);
    };
  }, []);

  const login = async (values) => {
    const result = await api.login(values);
    if (!result.user.occupantId) {
      throw new Error("Ce compte n'est pas rattache a un occupant.");
    }
    localStorage.setItem('hubinvest-session', JSON.stringify(result));
    setSession(result);
  };

  const logout = useCallback(() => {
    localStorage.removeItem('hubinvest-session');
    setSession(null);
  }, []);

  return session ? (
    <ContactsScreen session={session} apiOnline={apiOnline} setApiOnline={setApiOnline} onLogout={logout} />
  ) : (
    <LoginScreen apiOnline={apiOnline} onLogin={login} />
  );
}
