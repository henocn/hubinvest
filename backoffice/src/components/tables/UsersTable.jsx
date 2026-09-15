import { Check, Pencil, ShieldCheck, Trash2 } from 'lucide-react';
import { adminScopeLabels, roleLabels } from '../../constants/access';
import EmptyState from '../EmptyState';

export default function UsersTable({ users, query, currentUserId, onEdit, onDelete }) {
  if (!users.length) {
    return <EmptyState icon={ShieldCheck} title="Aucun utilisateur" copy={query ? 'Aucun résultat ne correspond à la recherche.' : 'Créez le premier accès à la plateforme.'} />;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead><tr><th>Utilisateur</th><th>Rôle</th><th>Périmètre</th><th>Statut</th><th className="actions-heading">Actions</th></tr></thead>
        <tbody>{users.map((user) => (
          <tr key={user.id}>
            <td><strong>{user.firstName} {user.lastName}</strong><small>{user.email}</small></td>
            <td>{roleLabels[user.role] || user.role}</td>
            <td>{user.role === 'occupant' ? user.occupant?.name : user.role === 'admin' ? adminScopeLabels[user.adminScope] || user.adminScope || '—' : '—'}</td>
            <td><span className={`status-pill ${user.isActive ? 'is-active' : ''}`}>{user.isActive && <Check size={13} />}{user.isActive ? 'Actif' : 'Inactif'}</span></td>
            <td><div className="row-actions">
              <button className="table-action is-icon" type="button" aria-label={`Modifier ${user.firstName} ${user.lastName}`} title="Modifier" onClick={() => onEdit(user)}><Pencil size={16} /></button>
              <button className="table-action is-icon is-danger" type="button" aria-label={`Supprimer ${user.firstName} ${user.lastName}`} disabled={user.id === currentUserId} title={user.id === currentUserId ? 'Votre propre compte ne peut pas être supprimé' : 'Supprimer'} onClick={() => onDelete(user)}><Trash2 size={16} /></button>
            </div></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
