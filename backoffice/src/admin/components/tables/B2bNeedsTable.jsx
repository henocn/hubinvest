import { Pencil } from 'lucide-react';
import EmptyState from '../EmptyState';
import { SelectAllHeader, SelectCell } from '../RowSelection';

// Demandes traitées sur demandes reçues, mises en avant tant qu'il en reste à traiter.
export function ProposalCount({ need }) {
  const total = need.proposalCount || 0;
  const handled = need.handledCount || 0;
  return <span className={`proposal-count${handled < total ? ' is-pending' : ''}`}>{handled}/{total}</span>;
}

// Besoins B2B publiés sur le site (dans les Paramètres) : un clic sur une ligne ouvre sa modification.
export default function B2bNeedsTable({ selection, needs, onEdit, showStand = true }) {
  if (!needs.length) {
    return <EmptyState title="Aucun besoin B2B" copy="Créez le premier besoin à publier." />;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead><tr><SelectAllHeader selection={selection} />{showStand && <th>Stand</th>}<th>Besoin</th><th>Demandes</th><th>Statut</th><th className="actions-heading">Action</th></tr></thead>
        <tbody>{needs.map((need) => (
          <tr key={need.id} className={`b2b-admin-row is-link is-${need.status}`} onClick={() => onEdit(need)}><SelectCell selection={selection} id={need.id} />
            {showStand && <td><strong>{need.occupant?.name || '—'}</strong></td>}
            <td><span className="b2b-admin-title">{need.title}</span></td>
            <td><ProposalCount need={need} /></td>
            <td>{need.status === 'open' ? 'Ouvert' : 'Fermé'}</td>
            <td><div className="row-actions"><button className="table-action is-icon" type="button" onClick={(event) => { event.stopPropagation(); onEdit(need); }} aria-label={`Modifier ${need.title}`} title="Modifier"><Pencil size={16} /></button></div></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
