import { Check, Clipboard, Pencil, Video } from 'lucide-react';
import { publicBaseUrl, studioStatusLabels } from '../../constants/access';
import EmptyState from '../EmptyState';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
});

export default function StudioInvitationsTable({ invitations, query, copiedId, onCopy, onEdit, showStand = false }) {
  if (!invitations.length) {
    return <EmptyState icon={Video} title="Aucune invitation" copy={query ? 'Aucun résultat ne correspond à la recherche.' : 'Créez la première invitation du Studio.'} />;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead><tr><th>Date</th>{showStand && <th>Stand</th>}<th>Invité</th><th>Sujet</th><th>Réponse</th><th className="actions-heading">Actions</th></tr></thead>
        <tbody>{invitations.map((invitation) => {
          const date = new Date(invitation.scheduledAt);
          const link = `${publicBaseUrl}/studio/${invitation.token}`;
          return (
            <tr key={invitation.id} className={`studio-row is-${invitation.status}`}>
              <td className="studio-date"><strong>{dateFormatter.format(date)}</strong><small>{timeFormatter.format(date)}</small></td>
              {showStand && <td>{invitation.occupant?.name || '—'}</td>}
              <td><strong>{invitation.guestName}</strong></td>
              <td className="activity-cell">{invitation.subject}</td>
              <td className="studio-status">{studioStatusLabels[invitation.status]}</td>
              <td><div className="row-actions">
                <button className={`table-action is-icon ${copiedId === invitation.id ? 'is-copied' : ''}`} type="button" aria-label={`Copier le lien de ${invitation.guestName}`} title={copiedId === invitation.id ? 'Lien copié' : 'Copier le lien'} onClick={() => onCopy(invitation.id, link)}>{copiedId === invitation.id ? <Check size={16} /> : <Clipboard size={16} />}</button>
                <button className="table-action is-icon" type="button" aria-label={`Modifier l’invitation de ${invitation.guestName}`} title="Modifier" onClick={() => onEdit(invitation)}><Pencil size={16} /></button>
              </div></td>
            </tr>
          );
        })}</tbody>
      </table>
    </div>
  );
}
