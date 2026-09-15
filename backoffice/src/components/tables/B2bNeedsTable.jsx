import { Handshake, Pencil } from 'lucide-react';
import EmptyState from '../EmptyState';

export default function B2bNeedsTable({ needs, query, onEdit }) {
  if (!needs.length) {
    return <EmptyState icon={Handshake} title="Aucun besoin B2B" copy={query ? 'Aucun résultat ne correspond à la recherche.' : 'Créez le premier besoin à publier.'} />;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead><tr><th>Stand</th><th>Besoin</th><th>Statut</th><th className="actions-heading">Action</th></tr></thead>
        <tbody>{needs.map((need) => (
          <tr key={need.id} className={`b2b-admin-row is-${need.status}`}>
            <td><strong>{need.occupant?.name || '—'}</strong></td>
            <td><span className="b2b-admin-title">{need.title}</span></td>
            <td>{need.status === 'open' ? 'Ouvert' : 'Fermé'}</td>
            <td><div className="row-actions"><button className="table-action is-icon" type="button" onClick={() => onEdit(need)} aria-label={`Modifier ${need.title}`} title="Modifier"><Pencil size={16} /></button></div></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
