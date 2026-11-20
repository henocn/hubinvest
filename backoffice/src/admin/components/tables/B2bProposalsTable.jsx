import { Check, Handshake, X } from 'lucide-react';
import { b2bProposalLabels } from '../../constants/access';
import EmptyState from '../EmptyState';
import { SelectAllHeader, SelectCell } from '../RowSelection';

const dateTime = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const statusClass = { pending: ' is-new', accepted: ' is-active', declined: '' };
const fullName = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(' ');

// Demandes reçues sur les besoins B2B, à accepter ou refuser ; la personne est prévenue par e-mail de la décision.
export default function B2bProposalsTable({ selection, proposals, query, showStand = true, deciding, onDecide }) {
  if (!proposals.length) {
    return <EmptyState icon={Handshake} title="Aucune demande B2B" copy={query ? 'Aucun résultat ne correspond à la recherche.' : 'Les réponses aux besoins publiés sur le site apparaîtront ici.'} />;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead><tr><SelectAllHeader selection={selection} /><th>Reçue le</th><th>Personne</th><th>Besoin</th><th>Message</th><th>Statut</th><th className="actions-heading">Actions</th></tr></thead>
        <tbody>{proposals.map((proposal) => (
          <tr key={proposal.id}><SelectCell selection={selection} id={proposal.id} />
            <td className="stand-nowrap">{dateTime.format(new Date(proposal.createdAt))}</td>
            <td>
              <strong>{proposal.fullName}</strong>
              <small><a href={`mailto:${proposal.email}`}>{proposal.email}</a></small>
              {proposal.phone && <small><a href={`tel:${proposal.phone}`}>{proposal.phone}</a></small>}
            </td>
            <td>
              <span className="b2b-need-name">{proposal.need?.title || '—'}</span>
              {showStand && proposal.need?.occupant && <small>{proposal.need.occupant.name}</small>}
            </td>
            <td className="b2b-message">{proposal.message}</td>
            <td>
              <span className={`status-pill${statusClass[proposal.status] ?? ''}`}>{b2bProposalLabels[proposal.status] || proposal.status}</span>
              {proposal.status !== 'pending' && proposal.handledBy && <small>par {fullName(proposal.handledBy)}</small>}
            </td>
            <td>{proposal.status === 'pending' && (
              <div className="row-actions">
                <button className="table-action" type="button" disabled={deciding === proposal.id} onClick={() => onDecide(proposal, 'accepted')}><Check size={15} /> Accepter</button>
                <button className="table-action is-danger" type="button" disabled={deciding === proposal.id} onClick={() => onDecide(proposal, 'declined')}><X size={15} /> Refuser</button>
              </div>
            )}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
