import { Check, Handshake, Pencil, Trash2, X } from 'lucide-react';
import { b2bProposalLabels } from '../../constants/access';
import EmptyState from '../EmptyState';
import { ActionsCell, Detail, ExpandableRow, useOpenRow } from '../RowDetails';
import { SelectAllHeader, SelectCell } from '../RowSelection';

const dateTime = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const statusClass = { pending: ' is-new', accepted: ' is-active', declined: '' };
const fullName = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(' ');

// Demandes reçues sur les besoins B2B, à accepter ou refuser ; la personne est prévenue par e-mail de la décision.
// Un clic sur la ligne affiche les coordonnées et le message.
export default function B2bProposalsTable({ selection, proposals, query, showStand = true, deciding, onDecide, onEdit, onDelete }) {
  const openRow = useOpenRow();
  if (!proposals.length) {
    return <EmptyState icon={Handshake} title="Aucune demande B2B" copy={query ? 'Aucun résultat ne correspond à la recherche.' : 'Les réponses aux besoins publiés sur le site apparaîtront ici.'} />;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead><tr><SelectAllHeader selection={selection} /><th>Reçue le</th><th>Personne</th><th>Besoin</th><th>Statut</th><th className="actions-heading">Actions</th></tr></thead>
        <tbody>{proposals.map((proposal) => (
          <ExpandableRow
            key={proposal.id}
            id={proposal.id}
            openRow={openRow}
            colSpan={6}
            details={<>
              <Detail label="E-mail"><a href={`mailto:${proposal.email}`}>{proposal.email}</a></Detail>
              <Detail label="Téléphone">{proposal.phone && <a href={`tel:${proposal.phone}`}>{proposal.phone}</a>}</Detail>
              {showStand && <Detail label="Stand">{proposal.need?.occupant?.name}</Detail>}
              <Detail label="Traitée par">{proposal.status !== 'pending' && fullName(proposal.handledBy)}</Detail>
              <Detail label="Message" wide>{proposal.message}</Detail>
            </>}
          >
            <SelectCell selection={selection} id={proposal.id} />
            <td className="stand-nowrap">{dateTime.format(new Date(proposal.createdAt))}</td>
            <td><strong>{proposal.fullName}</strong></td>
            <td><span className="cell-ellipsis">{proposal.need?.title || '—'}</span></td>
            <td><span className={`status-pill${statusClass[proposal.status] ?? ''}`}>{b2bProposalLabels[proposal.status] || proposal.status}</span></td>
            <ActionsCell>{proposal.status === 'pending' && <>
              <button className="table-action is-accept" type="button" disabled={deciding === proposal.id} onClick={() => onDecide(proposal, 'accepted')} aria-label={`Accepter la demande de ${proposal.fullName}`}><Check size={14} /> Accepter</button>
              <button className="table-action is-decline" type="button" disabled={deciding === proposal.id} onClick={() => onDecide(proposal, 'declined')} aria-label={`Refuser la demande de ${proposal.fullName}`}><X size={14} /> Refuser</button>
              <span className="row-actions-divider" aria-hidden="true" />
            </>}
              <button className="table-action is-icon" type="button" onClick={() => onEdit(proposal)} aria-label={`Modifier la demande de ${proposal.fullName}`} title="Modifier"><Pencil size={16} /></button>
              <button className="table-action is-icon is-danger" type="button" onClick={() => onDelete(proposal)} aria-label={`Supprimer la demande de ${proposal.fullName}`} title="Supprimer"><Trash2 size={16} /></button>
            </ActionsCell>
          </ExpandableRow>
        ))}</tbody>
      </table>
    </div>
  );
}
