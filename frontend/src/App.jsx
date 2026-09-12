import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Clock3,
  Cloud,
  Eye,
  EyeOff,
  LogOut,
  Phone,
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
import PublicPages from './PublicPages';

const qualificationLabels = {
  hot: 'Chaud',
  warm: 'Tiède',
  cold: 'Froid',
};

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

function LoginScreen({ onLogin }) {
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
        <div className="login-copy">
          <h1>Connexion</h1>
          <p>Accédez aux contacts de votre stand.</p>
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
        <a className="login-public-link" href="/stands">Découvrir les stands</a>
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
          Numéro de téléphone
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
          <span>La personne accepte d’être recontactée par cet occupant.</span>
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

function ContactDetail({ contact, onBack }) {
  const dialNumber = contact.phone?.replace(/[^\d+]/g, '');
  const nextActionDate = contact.nextActionAt ? new Date(contact.nextActionAt) : null;
  const formattedDate = nextActionDate && !Number.isNaN(nextActionDate.getTime())
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(nextActionDate)
    : null;

  return (
    <section className="workspace contact-detail-view">
      <button type="button" className="back-button" onClick={onBack}>
        <ArrowLeft size={18} />
        Mes contacts
      </button>

      <div className="detail-heading">
        <div>
          <h1>{contact.fullName}</h1>
          <span className={`qualification-label ${contact.qualification}`}>
            <Check size={14} />
            {qualificationLabels[contact.qualification]}
          </span>
        </div>
        {dialNumber && (
          <a className="button button-primary" href={`tel:${dialNumber}`}>
            <Phone size={18} />
            Appeler
          </a>
        )}
      </div>

      <div className="detail-panel">
        <dl className="detail-fields">
          <div><dt>Téléphone</dt><dd>{contact.phone}</dd></div>
          {contact.company && <div><dt>Entreprise</dt><dd>{contact.company}</dd></div>}
          {contact.need && <div><dt>Recherche</dt><dd>{contact.need}</dd></div>}
          {(contact.nextAction || formattedDate) && (
            <div>
              <dt>Prochaine action</dt>
              <dd>{contact.nextAction || 'Date planifiée'}{formattedDate && <small>{formattedDate}</small>}</dd>
            </div>
          )}
        </dl>
        <div className="detail-sync">
          {contact.syncStatus === 'pending' && <><Clock3 size={16} /> Enregistré sur ce téléphone · À synchroniser</>}
          {contact.syncStatus === 'syncing' && <><RefreshCw size={16} /> Synchronisation en cours</>}
          {(contact.syncStatus === 'synced' || !contact.syncStatus) && <><Cloud size={16} /> Synchronisé</>}
        </div>
        {contact.syncError && <p className="detail-error">Synchronisation impossible. Revenez à Mes contacts pour réessayer.</p>}
      </div>
    </section>
  );
}

function ContactsScreen({ session, apiOnline, setApiOnline, onLogout }) {
  const [view, setView] = useState('list');
  const [selectedContactId, setSelectedContactId] = useState(null);
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
    const queued = await queueContact(occupantId, values);
    await readLocal();
    setSelectedContactId(queued.id);
    setView('detail');
    if (apiOnline) sync();
  };

  if (view === 'new') {
    return <ContactForm onCancel={() => setView('list')} onCreated={createContact} />;
  }

  if (view === 'detail') {
    const selectedContact = contacts.find((contact) => contact.id === selectedContactId);
    if (selectedContact) {
      return <ContactDetail contact={selectedContact} onBack={() => setView('list')} />;
    }
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
        <button className="icon-button" type="button" onClick={onLogout} aria-label="Se déconnecter">
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
          <div><strong>{stats.byQualification.warm}</strong><span>Tièdes</span></div>
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
          <p className="pending-count">{pendingCount} contact{pendingCount > 1 ? 's' : ''} à synchroniser</p>
        )}

        {error && <p className="panel-error">{error}</p>}
        {loading && <p className="empty-state">Chargement des contacts...</p>}
        {!loading && !error && filteredContacts.length === 0 && (
          <div className="empty-state">
            <UserRound size={28} />
            <strong>Aucun contact</strong>
            <span>Enregistrez la première personne rencontrée sur le stand.</span>
          </div>
        )}

        {!loading && filteredContacts.length > 0 && (
          <div className="contact-list">
            {filteredContacts.map((contact) => (
              <button className="contact-row" type="button" key={contact.id} onClick={() => { setSelectedContactId(contact.id); setView('detail'); }} aria-label={`Voir le contact ${contact.fullName}`}>
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
                    {contact.syncStatus === 'pending' && 'À synchroniser'}
                    {contact.syncStatus === 'syncing' && 'Synchronisation'}
                    {(contact.syncStatus === 'synced' || !contact.syncStatus) && 'Synchronisé'}
                  </small>
                </div>
                <span className={`qualification-label ${contact.qualification}`}>
                  <Check size={14} />
                  {qualificationLabels[contact.qualification]}
                </span>
              </button>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

export default function App() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
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
      throw new Error("Ce compte n’est pas rattaché à un occupant.");
    }
    localStorage.setItem('hubinvest-session', JSON.stringify(result));
    setSession(result);
    window.location.assign('/espace-occupant');
  };

  const logout = useCallback(() => {
    localStorage.removeItem('hubinvest-session');
    setSession(null);
    window.location.assign('/connexion');
  }, []);

  if (path === '/' || path === '/stands' || path.startsWith('/stands/')) {
    return <PublicPages path={path} />;
  }

  if (path !== '/connexion' && path !== '/espace-occupant') {
    return <PublicPages path={path} />;
  }

  if (path === '/connexion') {
    return <LoginScreen onLogin={login} />;
  }

  return session ? (
    <ContactsScreen session={session} apiOnline={apiOnline} setApiOnline={setApiOnline} onLogout={logout} />
  ) : (
    <LoginScreen onLogin={login} />
  );
}
