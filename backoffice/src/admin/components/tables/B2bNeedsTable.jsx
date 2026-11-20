import { Pencil } from 'lucide-react';
import EmptyState from '../EmptyState';
import { ActionsCell, Detail, ExpandableRow, useOpenRow } from '../RowDetails';
import { SelectAllHeader, SelectCell } from '../RowSelection';

const day = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', day: 'numeric', month: 'long', year: 'numeric' });
const fullName = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(' ');

// Demandes traitées sur demandes reçues, mises en avant tant qu'il en reste à traiter.
export function ProposalCount({ need }) {
  const total = need.proposalCount || 0;
  const handled = need.handledCount || 0;
  return <span className={`proposal-count${handled < total ? ' is-pending' : ''}`}>{handled}/{total}</span>;
}

// Besoins B2B publiés sur le site (dans les Paramètres) ; un clic sur la ligne affiche la description.
export default function B2bNeedsTable({ selection, needs, onEdit, showStand = true }) {
  const openRow = useOpenRow();
  if (!needs.length) {
    return <EmptyState title="Aucun besoin B2B" copy="Créez le premier besoin à publier." />;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead><tr><SelectAllHeader selection={selection} />{showStand && <th>Stand</th>}<th>Besoin</th><th>Demandes</th><th>Statut</th><th className="actions-heading">Action</th></tr></thead>
        <tbody>{needs.map((need) => (
          <ExpandableRow
            key={need.id}
            id={need.id}
            openRow={openRow}
            className={`b2b-admin-row is-${need.status}`}
            colSpan={showStand ? 6 : 5}
            details={<>
              <Detail label="Publié par">{fullName(need.createdBy)}</Detail>
              <Detail label="Publié le">{need.createdAt && day.format(new Date(need.createdAt))}</Detail>
              <Detail label="Description" wide>{need.description}</Detail>
            </>}
          >
            <SelectCell selection={selection} id={need.id} />
            {showStand && <td><strong>{need.occupant?.name || '—'}</strong></td>}
            <td><span className="b2b-admin-title">{need.title}</span></td>
            <td><ProposalCount need={need} /></td>
            <td>{need.status === 'open' ? 'Ouvert' : 'Fermé'}</td>
            <ActionsCell><button className="table-action is-icon" type="button" onClick={() => onEdit(need)} aria-label={`Modifier ${need.title}`} title="Modifier"><Pencil size={16} /></button></ActionsCell>
          </ExpandableRow>
        ))}</tbody>
      </table>
    </div>
  );
}
