import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Check,
  Cloud,
  CloudOff,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import logo from '../../assets/Logo fond blanc.jpeg';
import { api } from './lib/api';

const roleLabels = {
  'super-admin': 'Super administrateur',
  'admin-apizf': 'Administrateur API-ZF',
  'investor-desk': 'Investor Desk',
  'equipe-campagne': 'Equipe campagne',
  animateur: 'Animateur',
  'occupant-responsable': 'Responsable occupant',
  'occupant-membre': 'Membre occupant',
  visiteur: 'Visiteur',
};

const adminRoles = new Set(['super-admin', 'admin-apizf']);
const occupantRoles = new Set(['occupant-responsable', 'occupant-membre']);

function ConnectionState({ online }) {
  return (
    <span className={`connection-state ${online ? 'is-online' : 'is-offline'}`}>
      {online ? <Cloud size={15} /> : <CloudOff size={15} />}
      {online ? 'API disponible' : 'API indisponible'}
    </span>
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
          <span>Administration</span>
        </div>
      </section>

      <section className="login-panel">
        <ConnectionState online={apiOnline} />
        <div className="login-copy">
          <h1>Connexion</h1>
          <p>Gerez les occupants et les acces a la plateforme.</p>
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
            <input
              type="password"
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

function EmptyState({ icon: Icon, title, copy }) {
  return (
    <div className="empty-state">
      <span><Icon size={22} /></span>
      <strong>{title}</strong>
      <p>{copy}</p>
    </div>
  );
}

function OccupantForm({ onClose, onCreated, token }) {
  const [form, setForm] = useState({ name: '', proofNumber: '', activity: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const created = await api.createOccupant(token, {
        name: form.name,
        proofNumber: form.proofNumber ? Number(form.proofNumber) : null,
        activity: form.activity || null,
      });
      onCreated(created);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="occupant-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="drawer-header">
          <div>
            <span className="eyebrow">Nouvel occupant</span>
            <h2 id="occupant-title">Creer une structure</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fermer">
            <X size={19} />
          </button>
        </header>

        <form onSubmit={submit} className="drawer-form">
          <label>
            Nom de la structure
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} minLength={2} required autoFocus />
          </label>
          <label>
            Numero de stand
            <input type="number" min="1" value={form.proofNumber} onChange={(event) => setForm({ ...form, proofNumber: event.target.value })} />
          </label>
          <label>
            Activite
            <textarea rows="5" value={form.activity} onChange={(event) => setForm({ ...form, activity: event.target.value })} />
          </label>
          {error && <p className="form-error">{error}</p>}
          <footer className="drawer-actions">
            <button className="button button-secondary" type="button" onClick={onClose}>Annuler</button>
            <button className="button button-primary" type="submit" disabled={loading}>
              {loading ? 'Creation...' : 'Creer l’occupant'}
            </button>
          </footer>
        </form>
      </aside>
    </div>
  );
}

function UserForm({ occupants, onClose, onCreated, token, currentRole }) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', password: '', role: 'occupant-responsable', occupantId: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const needsOccupant = occupantRoles.has(form.role);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const created = await api.createUser(token, {
        ...form,
        phone: form.phone || null,
        occupantId: needsOccupant ? form.occupantId : null,
      });
      onCreated(created);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="user-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="drawer-header">
          <div>
            <span className="eyebrow">Nouvel utilisateur</span>
            <h2 id="user-title">Creer un acces</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fermer"><X size={19} /></button>
        </header>

        <form onSubmit={submit} className="drawer-form">
          <div className="field-row">
            <label>Prenom<input value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} minLength={2} required autoFocus /></label>
            <label>Nom<input value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} minLength={2} required /></label>
          </div>
          <label>Adresse e-mail<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
          <label>Telephone<input type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
          <label>
            Role
            <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value, occupantId: '' })}>
              {Object.entries(roleLabels)
                .filter(([value]) => currentRole === 'super-admin' || value !== 'super-admin')
                .map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          {needsOccupant && (
            <label>
              Occupant rattache
              <select value={form.occupantId} onChange={(event) => setForm({ ...form, occupantId: event.target.value })} required>
                <option value="">Selectionner un occupant</option>
                {occupants.map((occupant) => <option key={occupant.id} value={occupant.id}>{occupant.name}</option>)}
              </select>
            </label>
          )}
          <label>Mot de passe temporaire<input type="password" minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></label>
          {error && <p className="form-error">{error}</p>}
          <footer className="drawer-actions">
            <button className="button button-secondary" type="button" onClick={onClose}>Annuler</button>
            <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Creation...' : 'Creer l’utilisateur'}</button>
          </footer>
        </form>
      </aside>
    </div>
  );
}

function AppShell({ session, onLogout }) {
  const [section, setSection] = useState('occupants');
  const [occupants, setOccupants] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drawer, setDrawer] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [occupantData, userData] = await Promise.all([
        api.occupants(session.token),
        api.users(session.token),
      ]);
      setOccupants(occupantData);
      setUsers(userData);
    } catch (requestError) {
      if (requestError.status === 401 || requestError.status === 403) onLogout();
      else setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [onLogout, session.token]);

  useEffect(() => { loadData(); }, [loadData]);

  const query = search.trim().toLowerCase();
  const visibleOccupants = useMemo(() => occupants.filter((occupant) =>
    !query || [occupant.name, occupant.activity, occupant.proofNumber].some((value) => String(value || '').toLowerCase().includes(query))), [occupants, query]);
  const visibleUsers = useMemo(() => users.filter((user) =>
    !query || [user.firstName, user.lastName, user.email, user.role, user.occupant?.name].some((value) => String(value || '').toLowerCase().includes(query))), [users, query]);

  const switchSection = (next) => {
    setSection(next);
    setSearch('');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <img src={logo} alt="API-ZF" />
          <div><strong>HubInvest</strong><span>Administration</span></div>
        </div>
        <nav aria-label="Navigation principale">
          <button className={section === 'occupants' ? 'is-active' : ''} onClick={() => switchSection('occupants')}>
            <Building2 size={18} /> Occupants
          </button>
          <button className={section === 'users' ? 'is-active' : ''} onClick={() => switchSection('users')}>
            <Users size={18} /> Utilisateurs
          </button>
        </nav>
        <div className="sidebar-user">
          <span className="user-avatar"><UserRound size={18} /></span>
          <div><strong>{session.user.firstName} {session.user.lastName}</strong><span>{roleLabels[session.user.role] || session.user.role}</span></div>
          <button className="icon-button" type="button" onClick={onLogout} aria-label="Se deconnecter"><LogOut size={18} /></button>
        </div>
      </aside>

      <main className="workspace">
        <header className="workspace-header">
          <div>
            <span className="eyebrow">Gestion</span>
            <h1>{section === 'occupants' ? 'Occupants' : 'Utilisateurs'}</h1>
            <p>{section === 'occupants' ? 'Structures presentes et informations de stand.' : 'Comptes et niveaux d’acces a la plateforme.'}</p>
          </div>
          <button className="button button-primary" type="button" onClick={() => setDrawer(section === 'occupants' ? 'occupant' : 'user')}>
            <Plus size={18} /> {section === 'occupants' ? 'Nouvel occupant' : 'Nouvel utilisateur'}
          </button>
        </header>

        <section className="summary-row" aria-label="Resume">
          <article><span>Total occupants</span><strong>{occupants.length}</strong><small>{occupants.filter((item) => item.status === 'active').length} actifs</small></article>
          <article><span>Utilisateurs</span><strong>{users.length}</strong><small>{users.filter((item) => item.isActive).length} actifs</small></article>
          <article><span>Administration</span><strong>{users.filter((item) => adminRoles.has(item.role)).length}</strong><small>comptes internes</small></article>
        </section>

        <section className="data-panel">
          <header className="data-toolbar">
            <label className="search-field"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Rechercher ${section === 'occupants' ? 'un occupant' : 'un utilisateur'}`} /></label>
            <button className="icon-button" type="button" onClick={loadData} aria-label="Actualiser"><RefreshCw size={18} /></button>
          </header>

          {error && <p className="panel-message is-error">{error}</p>}
          {loading && <p className="panel-message">Chargement des donnees...</p>}

          {!loading && section === 'occupants' && (visibleOccupants.length ? (
            <div className="table-scroll">
              <table>
                <thead><tr><th>Structure</th><th>Stand</th><th>Activite</th><th>Statut</th></tr></thead>
                <tbody>{visibleOccupants.map((occupant) => (
                  <tr key={occupant.id}>
                    <td><strong>{occupant.name}</strong><small>{occupant.slug}</small></td>
                    <td>{occupant.proofNumber || '—'}</td>
                    <td className="activity-cell">{occupant.activity || 'Non renseignee'}</td>
                    <td><span className={`status-pill ${occupant.status === 'active' ? 'is-active' : ''}`}>{occupant.status === 'active' && <Check size={13} />}{occupant.status === 'active' ? 'Actif' : 'Inactif'}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <EmptyState icon={Building2} title="Aucun occupant" copy={query ? 'Aucun resultat ne correspond a la recherche.' : 'Creez la premiere structure presente sur le salon.'} />)}

          {!loading && section === 'users' && (visibleUsers.length ? (
            <div className="table-scroll">
              <table>
                <thead><tr><th>Utilisateur</th><th>Role</th><th>Occupant</th><th>Statut</th></tr></thead>
                <tbody>{visibleUsers.map((user) => (
                  <tr key={user.id}>
                    <td><strong>{user.firstName} {user.lastName}</strong><small>{user.email}</small></td>
                    <td>{roleLabels[user.role] || user.role}</td>
                    <td>{user.occupant?.name || 'API-ZF'}</td>
                    <td><span className={`status-pill ${user.isActive ? 'is-active' : ''}`}>{user.isActive && <Check size={13} />}{user.isActive ? 'Actif' : 'Inactif'}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <EmptyState icon={ShieldCheck} title="Aucun utilisateur" copy={query ? 'Aucun resultat ne correspond a la recherche.' : 'Creez le premier acces a la plateforme.'} />)}
        </section>
      </main>

      {drawer === 'occupant' && <OccupantForm token={session.token} onClose={() => setDrawer(null)} onCreated={(created) => { setOccupants((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name))); setDrawer(null); }} />}
      {drawer === 'user' && <UserForm occupants={occupants} token={session.token} currentRole={session.user.role} onClose={() => setDrawer(null)} onCreated={(created) => { setUsers((current) => [...current, created]); setDrawer(null); }} />}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hubinvest-admin-session')); } catch { return null; }
  });
  const [apiOnline, setApiOnline] = useState(false);

  useEffect(() => {
    api.health().then(() => setApiOnline(true)).catch(() => setApiOnline(false));
  }, []);

  const login = async (values) => {
    const nextSession = await api.login(values);
    if (!adminRoles.has(nextSession.user.role)) throw new Error("Ce compte n'a pas acces a l'administration.");
    localStorage.setItem('hubinvest-admin-session', JSON.stringify(nextSession));
    setSession(nextSession);
  };

  const logout = useCallback(() => {
    localStorage.removeItem('hubinvest-admin-session');
    setSession(null);
  }, []);

  if (!session) return <LoginScreen apiOnline={apiOnline} onLogin={login} />;
  return <AppShell session={session} onLogout={logout} />;
}
