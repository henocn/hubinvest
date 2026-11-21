import { BriefcaseBusiness } from 'lucide-react';
import { guichetShortLabels, investorClassHints, investorClassShort, investorStatusLabel } from '../../constants/access';
import EmptyState from '../EmptyState';
import { SelectAllHeader, SelectCell } from '../RowSelection';

const dateTime = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const day = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', day: 'numeric', month: 'short' });
const fullName = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(' ');

// Prochaine échéance : la relance prévue, ou la réponse promise à une entreprise accompagnée. En rouge une fois dépassée.
const dueOf = (item) => {
  if (item.classification === 'support') return item.resolvedAt ? null : item.commitmentDueAt && { at: item.commitmentDueAt, label: day.format(new Date(item.commitmentDueAt)) };
  return item.nextFollowUpAt && { at: item.nextFollowUpAt, label: dateTime.format(new Date(item.nextFollowUpAt)) };
};

// Registre unique des guichets ; un clic sur la ligne ouvre la fiche du contact.
export default function InvestorRequestsTable({ selection, requests, query, onOpen }) {
  if (!requests.length) {
    return <EmptyState icon={BriefcaseBusiness} title="Aucun contact" copy={query ? 'Aucun résultat ne correspond à la recherche.' : 'Les rendez-vous, demandes de rappel et passages aux guichets apparaîtront ici.'} />;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead><tr><SelectAllHeader selection={selection} /><th>Reçu le</th><th>Contact</th><th>Guichet</th><th>Classe</th><th>Responsable</th><th>Échéance</th><th>Statut</th></tr></thead>
        <tbody>{requests.map((item) => {
          const due = dueOf(item);
          const late = due && new Date(due.at) < new Date() && item.status !== 'closed';
          return (
            <tr key={item.id} className="is-link" onClick={() => onOpen(item)}>
              <SelectCell selection={selection} id={item.id} />
              <td className="stand-nowrap">{dateTime.format(new Date(item.createdAt))}</td>
              <td><strong>{item.fullName}</strong>{(item.organization || item.difficulty?.company) && <small>{item.organization || item.difficulty?.company}</small>}</td>
              <td className="stand-nowrap">{guichetShortLabels[item.guichet]}</td>
              <td>{item.classification ? <span className={`investor-class is-${item.classification}`} title={investorClassHints[item.classification]}>{investorClassShort[item.classification]}</span> : <span className="stand-empty">À classer</span>}</td>
              <td className="stand-nowrap">{fullName(item.contactUser) || <span className="stand-empty">—</span>}</td>
              <td className={`stand-nowrap${late ? ' investor-late' : ''}`}>{due ? due.label : '—'}</td>
              <td><span className={`status-pill ${item.status === 'in_progress' ? 'is-active' : item.status === 'new' ? 'is-new' : ''}`}>{investorStatusLabel(item)}</span></td>
            </tr>
          );
        })}</tbody>
      </table>
    </div>
  );
}
