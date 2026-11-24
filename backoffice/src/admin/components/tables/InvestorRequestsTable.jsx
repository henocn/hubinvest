import { AlarmClock, BriefcaseBusiness } from 'lucide-react';
import { guichetShortLabels, investorClassHints, investorClassShort, investorStatusLabel } from '../../constants/access';
import EmptyState from '../EmptyState';
import { dueLabel, dueState } from '../../lib/due';
import { SelectAllHeader, SelectCell } from '../RowSelection';

const dateTime = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const fullName = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(' ');

// Prochaine échéance : la relance prévue, ou la réponse promise à une entreprise accompagnée (sans heure).
export const dueOf = (item) => {
  if (item.status === 'closed') return null;
  if (item.classification === 'support' && !item.nextFollowUpAt) return item.resolvedAt || !item.commitmentDueAt ? null : { at: item.commitmentDueAt, withTime: false };
  return item.nextFollowUpAt ? { at: item.nextFollowUpAt, withTime: true } : null;
};
// Ligne à signaler : relance en retard (fond rouge léger) ou à faire aujourd'hui (fond jaune léger).
export const dueStateOf = (item) => dueState(dueOf(item)?.at);

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
          const state = dueStateOf(item);
          return (
            <tr key={item.id} className={`is-link${state ? ` is-due-${state}` : ''}`} onClick={() => onOpen(item)}>
              <SelectCell selection={selection} id={item.id} />
              <td className="stand-nowrap">{dateTime.format(new Date(item.createdAt))}</td>
              <td><strong>{item.fullName}</strong>{(item.organization || item.difficulty?.company) && <small>{item.organization || item.difficulty?.company}</small>}</td>
              <td className="stand-nowrap">{guichetShortLabels[item.guichet]}</td>
              <td>{item.classification ? <span className={`investor-class is-${item.classification}`} title={investorClassHints[item.classification]}>{investorClassShort[item.classification]}</span> : <span className="stand-empty">À classer</span>}</td>
              <td className="stand-nowrap">{fullName(item.contactUser) || <span className="stand-empty">—</span>}</td>
              <td className={`stand-nowrap investor-due${state ? ` is-${state}` : ''}`}>
                {due ? <>{state && <AlarmClock size={14} aria-hidden="true" />}{state === 'late' && 'En retard · '}{dueLabel(due.at, { withTime: due.withTime })}</> : '—'}
              </td>
              <td><span className={`status-pill ${item.status === 'in_progress' ? 'is-active' : item.status === 'new' ? 'is-new' : ''}`}>{investorStatusLabel(item)}</span></td>
            </tr>
          );
        })}</tbody>
      </table>
    </div>
  );
}
