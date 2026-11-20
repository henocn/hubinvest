import { useEffect, useState } from 'react';
import { Check, Pencil, Trash2 } from 'lucide-react';
import { roleLabels } from '../../constants/access';
import EmptyState from '../EmptyState';

// Présence d'un compte, comme sur la Semaine de l'Industrie : en ligne, sinon depuis combien de temps.
const presenceOf = (online, lastSeenAt, now) => {
  if (online) return { label: 'En ligne', tone: 'online' };
  const then = lastSeenAt ? new Date(lastSeenAt).getTime() : NaN;
  if (Number.isNaN(then)) return { label: 'Jamais connecté', tone: 'offline' };
  const minutes = Math.floor(Math.max(0, now - then) / 60_000);
  if (minutes < 1) return { label: 'À l’instant', tone: 'recent' };
  if (minutes < 60) return { label: `Il y a ${minutes} min`, tone: 'recent' };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { label: hours === 1 ? 'Il y a 1 heure' : `Il y a ${hours} heures`, tone: 'away' };
  const days = Math.floor(hours / 24);
  if (days < 30) return { label: days === 1 ? 'Il y a 1 jour' : `Il y a ${days} jours`, tone: 'offline' };
  return { label: 'Hors ligne', tone: 'offline' };
};

export default function UsersTable({ users, query, currentUserId, onEdit, onDelete }) {
  // Les durées « Il y a X min » avancent d'elles-mêmes.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!users.length) {
    return <EmptyState title="Aucun utilisateur" copy={query ? 'Aucun résultat ne correspond à la recherche.' : 'Créez le premier accès à la plateforme.'} />;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead><tr><th>Utilisateur</th><th>Rôle</th><th>Stand</th><th>Présence</th><th>Statut</th><th className="actions-heading">Actions</th></tr></thead>
        <tbody>{users.map((user) => {
          const presence = presenceOf(user.online, user.lastSeenAt, now);
          return (
            <tr key={user.id}>
              <td><strong>{user.firstName} {user.lastName}</strong><small>{user.email}</small></td>
              <td>{roleLabels[user.role] || user.role}</td>
              <td>{['admin', 'occupant'].includes(user.role) ? user.occupant?.name || '—' : '—'}</td>
              <td><span className={`presence is-${presence.tone}`}>{presence.label}</span></td>
              <td><span className={`status-pill ${user.isActive ? 'is-active' : ''}`}>{user.isActive && <Check size={13} />}{user.isActive ? 'Actif' : 'Inactif'}</span></td>
              <td><div className="row-actions">
                <button className="table-action is-icon" type="button" aria-label={`Modifier ${user.firstName} ${user.lastName}`} title="Modifier" onClick={() => onEdit(user)}><Pencil size={16} /></button>
                <button className="table-action is-icon is-danger" type="button" aria-label={`Supprimer ${user.firstName} ${user.lastName}`} disabled={user.id === currentUserId} title={user.id === currentUserId ? 'Votre propre compte ne peut pas être supprimé' : 'Supprimer'} onClick={() => onDelete(user)}><Trash2 size={16} /></button>
              </div></td>
            </tr>
          );
        })}</tbody>
      </table>
    </div>
  );
}
