import { BriefcaseBusiness, Pencil } from 'lucide-react';
import { investorStatusLabels } from '../../constants/access';
import EmptyState from '../EmptyState';
import { ActionsCell, Detail, ExpandableRow, useOpenRow } from '../RowDetails';
import { SelectAllHeader, SelectCell } from '../RowSelection';

const dateTime = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// Demandes de l'Investor Desk ; un clic sur la ligne affiche les coordonnées, le projet et le suivi.
export default function InvestorRequestsTable({ selection, requests, query, onEdit, showStand = false }) {
  const openRow = useOpenRow();
  if (!requests.length) {
    return <EmptyState icon={BriefcaseBusiness} title="Aucune demande" copy={query ? 'Aucun résultat ne correspond à la recherche.' : 'Les demandes envoyées à l’Investor Desk apparaîtront ici.'} />;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead><tr><SelectAllHeader selection={selection} /><th>Reçue le</th><th>Demandeur</th>{showStand && <th>Stand</th>}<th>Statut</th><th>Responsable</th><th className="actions-heading">Actions</th></tr></thead>
        <tbody>{requests.map((item) => (
          <ExpandableRow
            key={item.id}
            id={item.id}
            openRow={openRow}
            colSpan={showStand ? 7 : 6}
            details={<>
              <Detail label="E-mail"><a href={`mailto:${item.email}`}>{item.email}</a></Detail>
              <Detail label="Téléphone">{item.phone && <a href={`tel:${item.phone}`}>{item.phone}</a>}</Detail>
              <Detail label="Accord API-ZF">{item.consentApizf ? 'Oui' : 'Non'}</Detail>
              <Detail label="Prochaine action">{item.nextAction}</Detail>
              <Detail label="Projet ou besoin" wide>{item.projectSummary}</Detail>
            </>}
          >
            <SelectCell selection={selection} id={item.id} />
            <td className="stand-nowrap">{dateTime.format(new Date(item.createdAt))}</td>
            <td><strong>{item.fullName}</strong></td>
            {showStand && <td>{item.occupant?.name || '—'}</td>}
            <td><span className={`status-pill ${item.status === 'in_progress' ? 'is-active' : item.status === 'new' ? 'is-new' : ''}`}>{investorStatusLabels[item.status]}</span></td>
            <td>{item.assignedTo ? `${item.assignedTo.firstName} ${item.assignedTo.lastName}` : '—'}</td>
            <ActionsCell><button className="table-action is-icon" type="button" aria-label={`Suivre la demande de ${item.fullName}`} title="Suivre" onClick={() => onEdit(item)}><Pencil size={16} /></button></ActionsCell>
          </ExpandableRow>
        ))}</tbody>
      </table>
    </div>
  );
}
