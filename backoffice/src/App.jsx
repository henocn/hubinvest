import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Check,
  Cloud,
  CloudOff,
  Eye,
  EyeOff,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
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

function PasswordInput(props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <input {...props} type={visible ? 'text' : 'password'} />
      <button type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} title={visible ? 'Masquer' : 'Afficher'}>
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
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

function EmptyState({ icon: Icon, title, copy }) {
  return (
    <div className="empty-state">
      <span><Icon size={22} /></span>
      <strong>{title}</strong>
      <p>{copy}</p>
    </div>
  );
}

function OccupantForm({ occupant, onClose, onSaved, token }) {
  const isEditing = Boolean(occupant);
  const [form, setForm] = useState(() => ({
    name: occupant?.name || '',
    proofNumber: occupant?.proofNumber || '',
    activity: occupant?.activity || '',
    status: occupant?.status || 'active',
  }));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const values = {
        name: form.name,
        proofNumber: form.proofNumber ? Number(form.proofNumber) : null,
        activity: form.activity || null,
        status: form.status,
      };
      const saved = isEditing
        ? await api.updateOccupant(token, occupant.id, values)
        : await api.createOccupant(token, values);
      await onSaved(saved);
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
            <span className="eyebrow">{isEditing ? 'Modification' : 'Nouvel occupant'}</span>
            <h2 id="occupant-title">{isEditing ? 'Modifier la structure' : 'Creer une structure'}</h2>
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
          {isEditing && (
            <label>
              Statut
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
            </label>
          )}
          {error && <p className="form-error">{error}</p>}
          <footer className="drawer-actions">
            <button className="button button-secondary" type="button" onClick={onClose}>Annuler</button>
            <button className="button button-primary" type="submit" disabled={loading}>
              {loading ? 'Enregistrement...' : isEditing ? 'Enregistrer les modifications' : "Creer l'occupant"}
            </button>
          </footer>
        </form>
      </aside>
    </div>
  );
}

function UserForm({ user, occupants, onClose, onSaved, token, currentRole, currentUserId }) {
  const isEditing = Boolean(user);
  const isCurrentUser = user?.id === currentUserId;
  const [form, setForm] = useState(() => ({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    password: '',
    role: user?.role || 'occupant-responsable',
    occupantId: user?.occupantId || '',
    isActive: user?.isActive ?? true,
  }));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const needsOccupant = occupantRoles.has(form.role);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const values = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || null,
        role: form.role,
        occupantId: needsOccupant ? form.occupantId : null,
        isActive: form.isActive,
      };
      if (!isEditing || form.password) values.password = form.password;

      const saved = isEditing
        ? await api.updateUser(token, user.id, values)
        : await api.createUser(token, values);
      await onSaved(saved);
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
            <span className="eyebrow">{isEditing ? 'Modification' : 'Nouvel utilisateur'}</span>
            <h2 id="user-title">{isEditing ? 'Modifier le compte' : 'Creer un acces'}</h2>
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
            <select value={form.role} disabled={isCurrentUser} onChange={(event) => setForm({ ...form, role: event.target.value, occupantId: '' })}>
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
          {isEditing && (
            <label>
              Statut
              <select value={form.isActive ? 'active' : 'inactive'} disabled={isCurrentUser} onChange={(event) => setForm({ ...form, isActive: event.target.value === 'active' })}>
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
            </label>
          )}
          <label>
            {isEditing ? 'Nouveau mot de passe' : 'Mot de passe temporaire'}
            <PasswordInput minLength={8} autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required={!isEditing} />
            {isEditing && <small className="field-hint">Laisser vide pour conserver le mot de passe actuel.</small>}
          </label>
          {error && <p className="form-error">{error}</p>}
          <footer className="drawer-actions">
            <button className="button button-secondary" type="button" onClick={onClose}>Annuler</button>
            <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Enregistrement...' : isEditing ? 'Enregistrer les modifications' : "Creer l'utilisateur"}</button>
          </footer>
        </form>
      </aside>
    </div>
  );
}

function ConfirmDelete({ subject, loading, error, onCancel, onConfirm }) {
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onCancel}>
      <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" onMouseDown={(event) => event.stopPropagation()}>
        <span className="danger-icon"><Trash2 size={21} /></span>
        <div>
          <h2 id="delete-title">Supprimer {subject.label}</h2>
          <p>Cette action est definitive. Les elements encore utilises par la plateforme ne pourront pas etre supprimes.</p>
        </div>
        {error && <p className="form-error dialog-error">{error}</p>}
        <footer>
          <button className="button button-secondary" type="button" onClick={onCancel} disabled={loading}>Annuler</button>
          <button className="button button-danger" type="button" onClick={onConfirm} disabled={loading}>{loading ? 'Suppression...' : 'Supprimer'}</button>
        </footer>
      </section>
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
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

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

  const saved = async () => {
    setDrawer(null);
    await loadData();
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      if (pendingDelete.type === 'occupant') {
        await api.deleteOccupant(session.token, pendingDelete.item.id);
      } else {
        await api.deleteUser(session.token, pendingDelete.item.id);
      }
      setPendingDelete(null);
      await loadData();
    } catch (requestError) {
      setDeleteError(requestError.message);
    } finally {
      setDeleting(false);
    }
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
          <button className="button button-primary" type="button" onClick={() => setDrawer({ type: section === 'occupants' ? 'occupant' : 'user', item: null })}>
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
                <thead><tr><th>Structure</th><th>Stand</th><th>Activite</th><th>Statut</th><th className="actions-heading">Actions</th></tr></thead>
                <tbody>{visibleOccupants.map((occupant) => (
                  <tr key={occupant.id}>
                    <td><strong>{occupant.name}</strong><small>{occupant.slug}</small></td>
                    <td>{occupant.proofNumber || '—'}</td>
                    <td className="activity-cell">{occupant.activity || 'Non renseignee'}</td>
                    <td><span className={`status-pill ${occupant.status === 'active' ? 'is-active' : ''}`}>{occupant.status === 'active' && <Check size={13} />}{occupant.status === 'active' ? 'Actif' : 'Inactif'}</span></td>
                    <td>
                      <div className="row-actions">
                        <button className="table-action" type="button" onClick={() => setDrawer({ type: 'occupant', item: occupant })}><Pencil size={15} /> Modifier</button>
                        <button className="table-action is-danger" type="button" onClick={() => { setDeleteError(''); setPendingDelete({ type: 'occupant', item: occupant, label: `l'occupant ${occupant.name}` }); }}><Trash2 size={15} /> Supprimer</button>
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <EmptyState icon={Building2} title="Aucun occupant" copy={query ? 'Aucun resultat ne correspond a la recherche.' : 'Creez la premiere structure presente sur le salon.'} />)}

          {!loading && section === 'users' && (visibleUsers.length ? (
            <div className="table-scroll">
              <table>
                <thead><tr><th>Utilisateur</th><th>Role</th><th>Occupant</th><th>Statut</th><th className="actions-heading">Actions</th></tr></thead>
                <tbody>{visibleUsers.map((user) => (
                  <tr key={user.id}>
                    <td><strong>{user.firstName} {user.lastName}</strong><small>{user.email}</small></td>
                    <td>{roleLabels[user.role] || user.role}</td>
                    <td>{user.occupant?.name || 'API-ZF'}</td>
                    <td><span className={`status-pill ${user.isActive ? 'is-active' : ''}`}>{user.isActive && <Check size={13} />}{user.isActive ? 'Actif' : 'Inactif'}</span></td>
                    <td>
                      <div className="row-actions">
                        <button className="table-action" type="button" onClick={() => setDrawer({ type: 'user', item: user })}><Pencil size={15} /> Modifier</button>
                        <button className="table-action is-danger" type="button" disabled={user.id === session.user.id} title={user.id === session.user.id ? 'Votre propre compte ne peut pas etre supprime' : undefined} onClick={() => { setDeleteError(''); setPendingDelete({ type: 'user', item: user, label: `l'utilisateur ${user.firstName} ${user.lastName}` }); }}><Trash2 size={15} /> Supprimer</button>
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <EmptyState icon={ShieldCheck} title="Aucun utilisateur" copy={query ? 'Aucun resultat ne correspond a la recherche.' : 'Creez le premier acces a la plateforme.'} />)}
        </section>
      </main>

      {drawer?.type === 'occupant' && <OccupantForm occupant={drawer.item} token={session.token} onClose={() => setDrawer(null)} onSaved={saved} />}
      {drawer?.type === 'user' && <UserForm user={drawer.item} occupants={occupants} token={session.token} currentRole={session.user.role} currentUserId={session.user.id} onClose={() => setDrawer(null)} onSaved={saved} />}
      {pendingDelete && <ConfirmDelete subject={pendingDelete} loading={deleting} error={deleteError} onCancel={() => setPendingDelete(null)} onConfirm={confirmDelete} />}
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
