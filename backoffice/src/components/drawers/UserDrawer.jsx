import { useState } from 'react';
import { X } from 'lucide-react';
import { adminScopeLabels, availableRoles, roleLabels } from '../../constants/access';
import { api } from '../../lib/api';
import PasswordInput from '../PasswordInput';

export default function UserDrawer({ user, occupants, onClose, onSaved, token, currentRole, currentUserId }) {
  const isEditing = Boolean(user);
  const isCurrentUser = user?.id === currentUserId;
  const [form, setForm] = useState(() => ({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    password: '',
    role: user?.role || 'occupant',
    occupantId: user?.occupantId || '',
    adminScope: user?.adminScope || '',
    isActive: user?.isActive ?? true,
  }));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const needsOccupant = form.role === 'occupant';
  const needsAdminScope = form.role === 'admin';

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
        adminScope: needsAdminScope ? form.adminScope : null,
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
          <div><span className="eyebrow">{isEditing ? 'Modification' : 'Nouvel utilisateur'}</span><h2 id="user-title">{isEditing ? 'Modifier le compte' : 'Créer un accès'}</h2></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fermer"><X size={19} /></button>
        </header>
        <form onSubmit={submit} className="drawer-form">
          <div className="field-row">
            <label>Prénom<input value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} minLength={2} required autoFocus /></label>
            <label>Nom<input value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} minLength={2} required /></label>
          </div>
          <label>Adresse e-mail<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
          <label>Téléphone<input type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
          <label>Rôle<select value={form.role} disabled={isCurrentUser} onChange={(event) => setForm({ ...form, role: event.target.value, occupantId: '', adminScope: '' })}>{Object.entries(roleLabels).filter(([value]) => availableRoles.has(value) && (currentRole === 'super-admin' || value !== 'super-admin')).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          {needsOccupant && <label>Occupant rattaché<select value={form.occupantId} onChange={(event) => setForm({ ...form, occupantId: event.target.value })} required><option value="">Sélectionner un occupant</option>{occupants.map((occupant) => <option key={occupant.id} value={occupant.id}>{occupant.name}</option>)}</select></label>}
          {needsAdminScope && <label>Périmètre<select value={form.adminScope} onChange={(event) => setForm({ ...form, adminScope: event.target.value })} required><option value="">Sélectionner un périmètre</option>{Object.entries(adminScopeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
          {isEditing && <label>Statut<select value={form.isActive ? 'active' : 'inactive'} disabled={isCurrentUser} onChange={(event) => setForm({ ...form, isActive: event.target.value === 'active' })}><option value="active">Actif</option><option value="inactive">Inactif</option></select></label>}
          <label>{isEditing ? 'Nouveau mot de passe' : 'Mot de passe temporaire'}<PasswordInput minLength={8} autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required={!isEditing} />{isEditing && <small className="field-hint">Laisser vide pour conserver le mot de passe actuel.</small>}</label>
          {error && <p className="form-error">{error}</p>}
          <footer className="drawer-actions">
            <button className="button button-secondary" type="button" onClick={onClose}>Annuler</button>
            <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Enregistrement...' : isEditing ? 'Enregistrer les modifications' : "Créer l’utilisateur"}</button>
          </footer>
        </form>
      </aside>
    </div>
  );
}
