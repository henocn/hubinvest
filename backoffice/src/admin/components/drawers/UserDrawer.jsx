import { useState } from 'react';
import { X } from 'lucide-react';
import { availableRoles, roleLabels } from '../../constants/access';
import { api } from '../../lib/api';
import PasswordInput from '../PasswordInput';
import PhoneInputField from '../../../components/PhoneInputField';

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
    isActive: user?.isActive ?? true,
  }));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const needsStand = ['admin', 'occupant'].includes(form.role);

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
        occupantId: needsStand ? form.occupantId : null,
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
          <button className="admin-icon-button" type="button" onClick={onClose} aria-label="Fermer"><X size={19} /></button>
        </header>
        <form onSubmit={submit} className="drawer-form">
          <div className="field-row">
            <label>Prénom<input value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} minLength={2} required autoFocus /></label>
            <label>Nom<input value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} minLength={2} required /></label>
          </div>
          <label>Adresse e-mail<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
          <PhoneInputField value={form.phone} onChange={(phone) => setForm((current) => ({ ...current, phone }))} />
          <label>Rôle<select value={form.role} disabled={isCurrentUser} onChange={(event) => setForm({ ...form, role: event.target.value, occupantId: '' })}>{Object.entries(roleLabels).filter(([value]) => availableRoles.has(value) && (currentRole === 'super-admin' || value !== 'super-admin')).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          {needsStand && <label>Stand rattaché<select value={form.occupantId} onChange={(event) => setForm({ ...form, occupantId: event.target.value })} required><option value="">Sélectionner un stand</option>{occupants.map((occupant) => <option key={occupant.id} value={occupant.id}>{occupant.name}</option>)}</select></label>}
          {isEditing && <label>Statut<select value={form.isActive ? 'active' : 'inactive'} disabled={isCurrentUser} onChange={(event) => setForm({ ...form, isActive: event.target.value === 'active' })}><option value="active">Actif</option><option value="inactive">Inactif</option></select></label>}
          <label>{isEditing ? 'Nouveau mot de passe' : 'Mot de passe temporaire'}<PasswordInput minLength={8} autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required={!isEditing} />{isEditing && <small className="field-hint">Laisser vide pour conserver le mot de passe actuel.</small>}</label>
          {error && <p className="admin-form-error">{error}</p>}
          <footer className="drawer-actions">
            <button className="button button-secondary" type="button" onClick={onClose}>Annuler</button>
            <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Enregistrement...' : isEditing ? 'Enregistrer les modifications' : "Créer l’utilisateur"}</button>
          </footer>
        </form>
      </aside>
    </div>
  );
}
