import { useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AuthLayout from './components/AuthLayout';
import PasswordField from './components/PasswordField';
import TeamShell from './components/TeamShell';
import BackofficePage from './admin/pages/BackofficePage';
import SettingsPage from './admin/pages/SettingsPage';
import DashboardPage from './admin/pages/DashboardPage';
import AnimatorRewardsPage from './pages/AnimatorRewardsPage';
import AnimatorScanPage from './pages/AnimatorScanPage';
import ContactsPage from './pages/ContactsPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import OccupantChallengePage from './pages/OccupantChallengePage';
import OccupantProfilePage from './pages/OccupantProfilePage';
import LiveQuestionsPage from './pages/LiveQuestionsPage';
import StudioPage from './admin/pages/StudioPage';
import { api } from './lib/api';
import { adminSectionForPath, homeForRole, isAdminRole } from './navigation';
import { SessionProvider, useSession } from './session';

const PUBLIC_URL = (import.meta.env.VITE_PUBLIC_URL || 'https://hub.investir.tg').replace(/\/$/, '');

function LoginPage() {
  const { signIn } = useSession();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    // Le clic sur « Se connecter » sert de geste pour la demande d'autorisation des notifications :
    // le navigateur l'affiche aussitôt, et l'appareil est abonné une fois dans l'espace.
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    setLoading(true);
    setError('');
    try {
      const result = await api.login(form);
      const home = homeForRole(result.user.role);
      if (!home) throw new Error('Ce compte n’a accès à aucun espace.');
      signIn(result);
      // Retour à la page demandée avant la connexion (lien d'une notification), sinon à l'accueil du rôle.
      window.location.assign(location.state?.from || home);
    } catch (requestError) {
      setError(requestError.message);
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="login-copy">
        <h1>Connexion</h1>
      </div>
      <form onSubmit={submit} className="form-stack">
        <label>
          Adresse e-mail
          <input type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
        </label>
        <label>
          Mot de passe
          <PasswordField autoComplete="current-password" minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
        </label>
        <Link className="auth-form-link" to="/mot-de-passe-oublie">Mot de passe oublié ?</Link>
        {error && <p className="form-error">{error}</p>}
        <button className="button button-primary button-large" type="submit" disabled={loading}>
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>
      <a className="login-public-link" href={`${PUBLIC_URL}/stands`}>Découvrir les stands</a>
    </AuthLayout>
  );
}

// Une rubrique d'administration : l'adresse choisit la section, une adresse interdite au rôle renvoie à l'accueil.
function AdminSection() {
  const { session, logout } = useSession();
  const location = useLocation();
  const section = adminSectionForPath(location.pathname, session.user.role);
  if (!section) return <Navigate to={homeForRole(session.user.role)} replace />;
  if (section === 'studio') return <StudioPage session={session} onLogout={logout} />;
  return <BackofficePage session={session} onLogout={logout} section={section} />;
}

function RequireSession({ children }) {
  const { session } = useSession();
  const location = useLocation();
  if (!session) return <Navigate to="/connexion" replace state={{ from: `${location.pathname}${location.search}` }} />;
  return children;
}

function TeamRoutes() {
  const { session, logout } = useSession();
  const role = session?.user.role;
  const props = { session, onLogout: logout };

  return (
    <Routes>
      <Route path="/connexion" element={session ? <Navigate to={homeForRole(role)} replace /> : <LoginPage />} />
      <Route path="/mot-de-passe-oublie" element={<ForgotPasswordPage />} />
      <Route element={<RequireSession><TeamShell /></RequireSession>}>
        {role === 'occupant' && (
          <>
            {/* Une seule route : le carnet reste chargé entre la liste, la fiche et le formulaire. */}
            <Route path="/contacts/*" element={<ContactsPage {...props} />} />
            <Route path="/defis" element={<OccupantChallengePage {...props} />} />
          </>
        )}
        {role === 'animateur' && (
          <>
            <Route path="/scan" element={<AnimatorScanPage {...props} />} />
            <Route path="/remises" element={<AnimatorRewardsPage {...props} />} />
          </>
        )}
        {(role === 'animateur' || role === 'super-admin') && <Route path="/questions" element={<LiveQuestionsPage {...props} />} />}
        <Route path="/profil" element={<OccupantProfilePage {...props} />} />
        {isAdminRole(role) && <Route path="/tableau-de-bord" element={<DashboardPage {...props} />} />}
        {isAdminRole(role) && <Route path="/parametres" element={<SettingsPage {...props} />} />}
        {isAdminRole(role) && <Route path="/*" element={<AdminSection />} />}
      </Route>
      <Route path="*" element={session ? <Navigate to={homeForRole(role)} replace /> : <RequireSession />} />
    </Routes>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <TeamRoutes />
    </SessionProvider>
  );
}
