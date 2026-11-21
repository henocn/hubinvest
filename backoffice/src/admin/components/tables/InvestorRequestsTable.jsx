import { BriefcaseBusiness } from 'lucide-react';
import { investorClassHints, investorStatusLabels } from '../../constants/access';
import EmptyState from '../EmptyState';
import { SelectAllHeader, SelectCell } from '../RowSelection';

const dateTime = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const fullName = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(' ');
const isLate = (item) => item.nextFollowUpAt && new Date(item.nextFollowUpAt) < new Date() && item.status !== 'closed';

// Demandes de l'Investor Desk ; un clic sur la ligne ouvre la fiche (qualification, classe, relances, rendez-vous).
// Une relance dépassée apparaît en rouge.
export default function InvestorRequestsTable({ selection, requests, query, onOpen }) {
  if (!requests.length) {
    return <EmptyState icon={BriefcaseBusiness} title="Aucune demande" copy={query ? 'Aucun résultat ne correspond à la recherche.' : 'Les demandes envoyées à l’Investor Desk apparaîtront ici.'} />;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead><tr><SelectAllHeader selection={selection} /><th>Reçue le</th><th>Demandeur</th><th>Classe</th><th>Interlocuteur</th><th>Prochaine relance</th><th>Statut</th></tr></thead>
        <tbody>{requests.map((item) => (
          <tr key={item.id} className="is-link" onClick={() => onOpen(item)}>
            <SelectCell selection={selection} id={item.id} />
            <td className="stand-nowrap">{dateTime.format(new Date(item.createdAt))}</td>
            <td><strong>{item.fullName}</strong></td>
            <td>{item.classification ? <span className={`investor-class is-${item.classification}`} title={investorClassHints[item.classification]}>{item.classification}</span> : <span className="stand-empty">À classer</span>}</td>
            <td>{fullName(item.contactUser) || <span className="stand-empty">À désigner</span>}</td>
            <td className={`stand-nowrap${isLate(item) ? ' investor-late' : ''}`}>{item.nextFollowUpAt ? dateTime.format(new Date(item.nextFollowUpAt)) : '—'}</td>
            <td><span className={`status-pill ${item.status === 'in_progress' ? 'is-active' : item.status === 'new' ? 'is-new' : ''}`}>{investorStatusLabels[item.status]}</span></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
