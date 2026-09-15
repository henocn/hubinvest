import { LogOut } from 'lucide-react';
import { useState } from 'react';
import PasswordField from '../components/PasswordField';
import { useOccupantProfile } from '../components/occupant/OccupantShell';
import { api } from '../lib/api';

export default function OccupantProfilePage({ session, onLogout }) {
  const profile = useOccupantProfile() || session.user;
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const changePassword = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.changeOwnPassword(session.token, { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setSuccess('Mot de passe modifié.');
    } catch (requestError) {
      if (requestError.status === 401 || requestError.status === 403) onLogout();
      else setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="workspace occupant-profile-workspace">
      <div className="page-heading"><h1>Profil</h1></div>

      <section className="occupant-profile-details" aria-label="Informations du compte">
        <dl className="detail-fields">
          <div><dt>Nom</dt><dd>{profile.firstName} {profile.lastName}</dd></div>
          <div><dt>Adresse e-mail</dt><dd>{profile.email}</dd></div>
          {profile.phone && <div><dt>Téléphone</dt><dd>{profile.phone}</dd></div>}
          {profile.occupant?.name && <div><dt>Structure</dt><dd>{profile.occupant.name}</dd></div>}
          {profile.occupant?.standLabel && <div><dt>Emplacement</dt><dd>{profile.occupant.standLabel}</dd></div>}
        </dl>
      </section>

      <section className="occupant-password-panel">
        <h2>Modifier le mot de passe</h2>
        <form className="form-stack" onSubmit={changePassword}>
          <label>Mot de passe actuel<PasswordField value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" minLength={8} maxLength={128} required /></label>
          <label>Nouveau mot de passe<PasswordField value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={8} maxLength={128} required /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          {success && <p className="profile-success" role="status">{success}</p>}
          <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Enregistrement…' : 'Enregistrer'}</button>
        </form>
      </section>

      <button className="profile-logout" type="button" onClick={onLogout}><LogOut size={19} /> Se déconnecter</button>
    </main>
  );
}
