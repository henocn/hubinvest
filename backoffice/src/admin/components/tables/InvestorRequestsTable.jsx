import { BriefcaseBusiness, Pencil } from 'lucide-react';
import { investorStatusLabels } from '../../constants/access';
import EmptyState from '../EmptyState';
import { SelectAllHeader, SelectCell } from '../RowSelection';

export default function InvestorRequestsTable({ selection, requests, query, onEdit, showStand = false }) {
  if (!requests.length) {
    return <EmptyState icon={BriefcaseBusiness} title="Aucune demande" copy={query ? 'Aucun résultat ne correspond à la recherche.' : 'Les demandes envoyées à l’Investor Desk apparaîtront ici.'} />;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead><tr><SelectAllHeader selection={selection} /><th>Demandeur</th>{showStand && <th>Stand</th>}<th>Projet ou besoin</th><th>Statut</th><th>Responsable</th><th className="actions-heading">Actions</th></tr></thead>
        <tbody>{requests.map((item) => (
          <tr key={item.id}><SelectCell selection={selection} id={item.id} />
            <td><strong>{item.fullName}</strong><small>{item.email}</small></td>
            {showStand && <td>{item.occupant?.name || '—'}</td>}
            <td className="activity-cell">{item.projectSummary}</td>
            <td><span className={`status-pill ${item.status === 'in_progress' ? 'is-active' : item.status === 'new' ? 'is-new' : ''}`}>{investorStatusLabels[item.status]}</span></td>
            <td>{item.assignedTo ? `${item.assignedTo.firstName} ${item.assignedTo.lastName}` : 'Non attribuée'}</td>
            <td><div className="row-actions"><button className="table-action is-icon" type="button" aria-label={`Suivre la demande de ${item.fullName}`} title="Suivre" onClick={() => onEdit(item)}><Pencil size={16} /></button></div></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
